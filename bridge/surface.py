"""Conservative four-tag planar mapping. No stale homography reuse."""
import cv2
import numpy as np

WIDTH, HEIGHT, TAG_SIZE = 1200, 800, 120
TAG_POSITIONS = {0: (30, 30), 1: (1050, 30), 2: (1050, 650), 3: (30, 650)}


def marker_corners(tag_id):
    x, y = TAG_POSITIONS[tag_id]
    return np.array([[x,y],[x+TAG_SIZE,y],[x+TAG_SIZE,y+TAG_SIZE],[x,y+TAG_SIZE]], dtype=np.float32)


class SurfaceMapper:
    def __init__(self):
        dictionary = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
        parameters = cv2.aruco.DetectorParameters()
        parameters.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
        self.detector = cv2.aruco.ArucoDetector(dictionary, parameters)

    def map(self, bgr, gaze_x, gaze_y):
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY) if bgr.ndim == 3 else bgr
        corners, ids, _ = self.detector.detectMarkers(gray)
        found = {}
        if ids is not None:
            for tag_id, points in zip(ids.flatten(), corners):
                if int(tag_id) in TAG_POSITIONS:
                    if int(tag_id) in found:  # duplicate IDs are ambiguous
                        return None, len(found)
                    found[int(tag_id)] = points.reshape(4,2)
        if len(found) != 4:
            return None, len(found)
        src = np.concatenate([found[i] for i in range(4)]).astype(np.float32)
        dst = np.concatenate([marker_corners(i) for i in range(4)])
        # Fit mat->camera and measure residual in camera pixels.
        # Tag centers span the surface and tolerate local corner distortion on
        # monitors better than requiring 14/16 corners within four pixels.
        src_centers = src.reshape(4,4,2).mean(axis=1)
        dst_centers = dst.reshape(4,4,2).mean(axis=1)
        if not cv2.isContourConvex(src_centers.astype(np.float32)):
            return None, 4
        H = cv2.getPerspectiveTransform(dst_centers, src_centers)
        if H is None:
            return None, 4
        projected = cv2.perspectiveTransform(dst.reshape(-1,1,2), H).reshape(-1,2)
        tag_scale = np.median(np.linalg.norm(src.reshape(4,4,2)[:,1]-src.reshape(4,4,2)[:,0],axis=1))
        if np.max(np.linalg.norm(projected-src, axis=1)) > max(8, tag_scale*.25):
            return None, 4
        if not np.isfinite([gaze_x,gaze_y]).all():
            return None, 4
        try:
            inverse = np.linalg.inv(H)
            mapped = cv2.perspectiveTransform(np.array([[[gaze_x,gaze_y]]],dtype=np.float32), inverse)[0,0]
        except (np.linalg.LinAlgError, cv2.error):
            return None, 4
        if not np.isfinite(mapped).all():
            return None, 4
        return (float(mapped[0]/WIDTH), float(mapped[1]/HEIGHT)), 4
