import sys
import unittest
from pathlib import Path
import cv2
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'bridge'))
from surface import SurfaceMapper
from generate_mat import generate

class SurfaceTests(unittest.TestCase):
    def test_flat_and_perspective_mapping(self):
        image=generate()
        mapper=SurfaceMapper()
        point,count=mapper.map(image,600,344)
        self.assertEqual(count,4)
        np.testing.assert_allclose(point,[.5,.43],atol=.003)
        H=cv2.getPerspectiveTransform(np.float32([[0,0],[1200,0],[1200,800],[0,800]]),np.float32([[140,80],[1100,30],[1160,780],[20,700]]))
        warped=cv2.warpPerspective(image,H,(1250,850),borderValue=255)
        eye=cv2.perspectiveTransform(np.array([[[924,344]]],np.float32),H)[0,0]
        point,count=mapper.map(warped,*eye)
        self.assertEqual(count,4)
        np.testing.assert_allclose(point,[.77,.43],atol=.005)
    def test_occlusion_and_empty_frame_invalidate_mapping(self):
        image=generate();mapper=SurfaceMapper()
        self.assertIsNotNone(mapper.map(image,600,344)[0])
        image[0:160,0:160]=255
        self.assertIsNone(mapper.map(image,600,344)[0])
        self.assertIsNone(mapper.map(np.full((800,1200),255,np.uint8),600,344)[0])
    def test_nonfinite_gaze_rejected(self):
        self.assertIsNone(SurfaceMapper().map(generate(),float('nan'),344)[0])

if __name__=='__main__':unittest.main()
