# 第三方依赖与许可

项目整体尚无 LICENSE。以下是第三方组件的许可，不构成 Donut Song 的整体授权。

| 组件 | 版本 / 约束 | 上游许可与来源 |
| --- | --- | --- |
| p5.js | 1.11.11，随包 vendor/p5.min.js | LGPL-2.1；[随包文本](vendor/p5-LICENSE.txt)、[源代码](https://github.com/processing/p5.js/tree/v1.11.11) |
| pupil-labs-realtime-api | 1.6.2 | MIT；https://github.com/pupil-labs/pl-realtime-api |
| pupil-labs-neon-recording | 1.0.1 | MIT；https://github.com/pupil-labs/pl-neon-recording |
| opencv-contrib-python | >=4.10,<5 | Apache-2.0；https://github.com/opencv/opencv-python ；轮子包含第三方组件，须同时查看其 LICENSE-3RD-PARTY.txt |
| NumPy | 2.3.5 | BSD-3-Clause；https://github.com/numpy/numpy ；二进制轮子可能包含额外许可 |
| packaging | >=24,<27 | Apache-2.0 OR BSD-2-Clause；https://github.com/pypa/packaging |
| websockets | >=14,<16 | BSD-3-Clause；https://github.com/python-websockets/websockets |

Python 组件由 requirements.txt 安装，不随静态部署包捆绑。上述许可依据本次安装版本元数据核对；传递依赖与二进制组件的许可应以实际安装包附带 LICENSE / NOTICE 为准。AprilTag 编码由 OpenCV 生成。

页面布局、文案与概念乐谱为本项目原创。信息分层参考 FlowIO：https://www.softrobotics.io/ ，未使用其品牌或媒体素材。

Desktop distribution also bundles CPython (PSF license), PyInstaller runtime (GPL with the bootloader distribution exception), and the transitive dependencies listed in `desktop/requirements-macos-arm64.lock.txt`. Package metadata and license files from the build environment are included inside the app's `Contents/Resources/licenses/` folder. The offline iOS app includes p5.js and its accompanying LGPL text. Project-wide licensing remains as described above; this release does not assign a new license to the author's code.
