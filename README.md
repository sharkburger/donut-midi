# Donut Song / 甜甜圈之歌

一个使用 p5.js 绘制、Web Audio 合成声音的可食用眼动乐器。注视选音，瞳孔变化改变音色，品尝与吃完改变作品的进程。界面中文，依赖已随包保存，模拟和回放可离线运行。

## 下载桌面测试版与 iOS 测试进度

首个桌面软件版本为 **0.2.0-beta.1**：[GitHub Releases](https://github.com/sharkburger/donut-midi/releases)。Mac Apple Silicon / macOS 14+ 下载解压后双击启动，Python 和 Neon 连接依赖随包提供，演奏台在默认浏览器打开。详见 [桌面安装说明](desktop/README.md)。此包尚未经过 Apple 公证；真实 Neon 硬件仍需联调。

iOS 第一版范围为 **触摸演奏与 JSON 回放**，含原生导入、导出及切后台停音；不含 Neon 直连。工程和 TestFlight 准备步骤在 [ios/README.md](ios/README.md)。尚无 Apple 开发者账号，尚未上传 TestFlight，也没有可用邀请链接。本项目没有提交正式 App Store 上架。

## 网站与命名

统一名称为 **Donut Song／甜甜圈之歌**。Donut Eye 是早期称呼；`donut-midi` 保留为仓库名与 GitHub Pages 路径。当前使用 Web Audio 合成声音，没有 MIDI 输出。

- `index.html`：Home，项目介绍、原创圆环乐谱、无声交互示意与资源入口。
- `play.html`：Play，保留现有真实演奏工作台。
- `get-started.html`：无设备、合成示例与 Neon 三条入门路径。
- `build.html`：定位、制作、映射、工作坊、数据与验证边界。
- `open-source.html`：本地运行、代码导览、GitHub 贡献和许可状态。

信息组织学习 FlowIO 的项目／工具／文档／制作／贡献分层（https://www.softrobotics.io/），布局、文字和视觉为原创。未复制其品牌或素材。

## 先体验（不需要 Neon）

1. 双击 `play.html`，用 Chrome / Edge / Safari 打开。也可在 Mac 双击 `启动甜甜圈之歌.command`，或在此文件夹运行 `python3 serve.py`。本机首页为 http://127.0.0.1:8088 ，演奏台为 http://127.0.0.1:8088/play.html 。实时连接建议使用这个本机网址，不使用 file:// 页面。
2. 点击「开启声音与演奏」，浏览器需要这一次点击才能播放声音。
3. 在三个甜甜圈区域停留约半秒，分别演奏 C4 / E4 / G4。持续停留只发一次，离开再看可再次发声。
4. 移动右侧「模拟瞳孔」滑块，改变随后音符或延音的音色。滑块是合成输入，不是测量值。
5. 切换「品尝」，延续最后一个声音，暂停新选音；切换「余味」恢复选音。
6. 点击某个甜甜圈下面的「吃完了」，退出该声部；再次点击撤销。「重新摆盘」恢复全部。
7. 看休止区让声音衰减；空格暂停／恢复声音。输入框、按钮获得焦点时空格遵循原控件行为。

想快速听完整示例：选择「数据回放」→「示例数据」→「播放」。30 秒示例全部由程序合成，不是参与者数据。

## 工作坊中怎么教

- **注视版**：先只改三个音高和停留时间，理解“输入→规则→声音”。
- **身体版**：打开身体调制，比较音色的变化；参考值并不等于“情绪中性”。
- **自定版**：选择音色明亮度或轻微颤音，改变调制强度。
- 无设备的小组继续用模拟或回放模式创作；有设备的小组轮流佩戴与品尝。
- 「投影视图」隐藏控制台。仍保留输入来源和记录状态，点击「返回创作台」退出。
- 每个参与者更换时重新采集参考值。程序不自动判断喜欢、情绪、认知负荷、咀嚼或吃完。

## 连接 Neon

### 一次性安装

需要 Python 3.11 或更新版本；实际软件检查环境为 macOS / Python 3.14。不同平台的二进制依赖仍可能需要安装适配。先进入此文件夹：

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r bridge/requirements.txt
```

Windows 激活命令为 `.venv\Scripts\activate`。不要在已有研究环境中直接升级依赖，使用独立虚拟环境。

### 布置桌面

1. 打印 `mat.svg`，A3 横向，保持比例，建议哑光纸。图面比例为 1.5:1（420 × 280 mm），页面可能留白；整体等比缩放不改变定位，不能单独移动或缩放标记。
2. 保持四角 AprilTag 36h11 标记（ID 0、1、2、3）全部可见，勿裁切、旋转单个标记或被餐盘遮挡。
3. 把三个甜甜圈或品尝小碟放在圆心附近。系统识别固定区域，不识别甜甜圈本身。食物移走后该区域仍是同一个音符，直到同伴点击「吃完了」。
4. 参与者应能自然看到整个桌垫；准备/采集参考值时保持同一观看位置。每次正式体验前分别看三个圆心，确认光标位置正确。

### 运行

1. Neon 接 Companion，打开应用；手机和电脑在相同且允许设备互通的局域网。启用 **Compute eye state**（具体名称随 Companion 版本变化），以提供瞳孔直径。
2. 一个终端启动网页：`python serve.py`。
3. 另一个已激活环境的终端启动桥接：`python bridge/neon_bridge.py`。
4. 自动发现失败时可以指定手机 IP：`python bridge/neon_bridge.py --ip 192.168.1.20`，替换为手机实际地址。连接端口为 8080。
5. 网页选择「Neon 实时」，点击连接。默认桥接地址 `ws://127.0.0.1:8765`。
6. 确认状态显示「注视与瞳孔可用」。点击「采集参考值 · 15 秒」，保持观看位置与照明稳定；有效样本不足会拒绝采集。采集完成后再开启观看与声音。
7. 只有注视而无瞳孔时，仍能选音，但不能启用有效的身体调制；检查 Compute eye state 设置。

### 第一版的实时边界

- 使用官方客户端的**场景视频与注视匹配样本**，约为场景帧率（通常约 30 Hz）；不是完整 200 Hz 眼动记录。浏览器记录也是约 30 Hz，可能重复或丢失设备样本，不用于精密扫视/凝视检测。
- 四个标记缺少任何一个便使桌面定位无效，不沿用旧单应矩阵。此时暂停新选音；品尝阶段的有效瞳孔仍可调制延音。
- 数据超过 500 ms 未更新或眼镜未佩戴会暂停新选音；实时掉线也会释放延音。短暂瞳孔缺失保持片刻，然后回到中性音色。
- 使用平面单应映射，未做场景镜头畸变矫正，也未做食物高度的 3D 补偿。相机边缘、极斜视角、高餐具和抬起的食物可能带来误差。定位残差过大时拒绝映射。必须先通过现场圆心检查。
- 桥接只向本机网页提供数值，不保存或发往网页相机画面，不主动启动 Neon 录像。Companion 自己的录制/上传设置需由主持人另行管理。
- 本轮已检查 SDK 导入、接口签名、合成透视定位与遮挡失效；**没有使用真实 Neon 完成硬件联调**。需要你提供设备做最后验证。

## 记录、导出与回放

默认不记录。说明用途并获得同意后勾选相应选项，再点「开始记录」。切换来源会停止当前记录；取消勾选也会停止。停止后点击「导出 JSON」。刷新或关闭页面会失去未导出的内存记录，下一次停止记录会替换上一份待导出记录。

记录包含：
- `schema: donut-song/1`、程序版本、输入来源和开始时间。
- `initial`：本轮初始映射、阶段与参考值。
- `samples`：相对时间（毫秒）、桌垫坐标、左右瞳孔（mm）、有效性、设备时间戳（秒）、场景注视坐标、个人参考值、平滑值、阶段与消耗状态。
- `events`：音符、阶段切换、映射修改、吃完/撤销、声音开关与人工标记。

不会记录姓名、音频、视频。模拟记录会标注 `simulate`，不能当真人数据。M 键或「标记时刻」可留下回访节点。

导入 JSON 后，回放恢复原有输入、阶段、参考值与消耗状态，**使用当前声音映射重新配乐**。这不是原演出的逐采样音频复现，也不会自动应用旧的映射修改事件；这些事件保留用于分析。暂停后可调整规则，回到开头重新播放。

本版暂未实现音频导出、完整视频回访、原始全频率记录、统一外部时钟同步和可撤回的长期数据管理。如计划正式 DIS 数据采集，需要在伦理方案中明确记录用途，并补充研究所需的数据精度与保存流程。

## 学员改哪里

- `core.js`：甜甜圈区域、停留交互、有效瞳孔判断、回放格式验证。
- `app.js`：交互状态、声音合成、数据映射、p5.js 绘图。搜索 `WORKSHOP` 找到视觉入口；`Instrument.update()` 控制身体→声音映射。
- `style.css`：布局和颜色。
- `bridge/surface.py`：AprilTag 识别与平面映射。
- `bridge/neon_bridge.py`：设备接入与本机 WebSocket。

前端不需要构建工具、npm、CDN 或 API 密钥。声音采用 Web Audio，不依赖 p5.sound。

## 验证命令

```sh
node --test tests/*.test.cjs
python tests/test_surface.py
python tests/test_bridge.py
```

## 上游资料与许可

p5.js 1.11.11 随包分发，许可见 `vendor/p5-LICENSE.txt`。

- [Neon 数据流](https://docs.pupil-labs.com/neon/data-collection/data-streams/)
- [官方 Python 实时客户端](https://pupil-labs.github.io/pl-realtime-api/)
- [OpenCV ArUco / AprilTag 检测](https://docs.opencv.org/4.x/d5/dae/tutorial_aruco_detection.html)

本项目的绘图、状态机与桥接由本次任务编写；AprilTag 编码由 OpenCV 生成。


## 网站维护与 GitHub Pages 部署

前端仍是原生 HTML、CSS、JavaScript、p5.js 与 Web Audio，无 npm 或构建依赖，p5.js 使用 `vendor/p5.min.js` 本地版本。官网样式和无声示意在 `site.css` / `site.js`；工作台样式与路径引导在 `style.css` / `play-entry.js`。修改核心逻辑前请运行已有测试，保持 `donut-song/1` 兼容。

在项目目录执行 `python3 serve.py`，浏览器访问 http://127.0.0.1:8088/ 。双击 HTML 可查看静态页面，但实时设备路径只支持本机 HTTP。Mac 启动脚本仍打开项目首页。所有页面与资源用相对链接，支持 `/donut-midi/` 子路径与独立 HTML 刷新，无需 SPA 回退。

旧的 `index.html` 地址现在打开官网；演奏功能在 `play.html`。`index.html?source=simulate|replay|live` 和 `index.html#play` 会转到工作台。原本没有查询参数的书签改为官网入口，首页提供直接体验按钮。

部署有两种方式：

1. 将项目源文件提交至仓库，GitHub Settings → Pages → Deploy from a branch，选择实际部署分支的根目录 `/`。`.nojekyll` 避免 Jekyll 处理。
2. 执行 `python3 scripts/package_site.py`，生成 `outputs/github-pages/` 和 `outputs/donut-song-pages.zip`；将该静态目录交给 Pages 静态上传流程，入口必须在产物根层的 `index.html`。`outputs/donut-song-source.zip` 包含可本地启动和运行测试的完整源文件。

打包使用明确文件列表，不包含虚拟环境、缓存、临时记录或 Git 元数据。生成后本地预览部署产物：`python3 -m http.server 8089 --bind 127.0.0.1 --directory outputs/github-pages`。网页源文件随桌面测试版一同发布；GitHub Pages 的线上状态需以部署结果为准。

### HTTPS 与本地设备

桥接显式只允许本机 `http://127.0.0.1` / `http://localhost` Origin。实际 WebSocket 测试会拒绝 `https://sharkburger.github.io` 和 `null`（file 页面）来源。因此官网公开 HTTPS 页面不支持直连；工作台在这些来源禁用连接按钮并给出本地步骤。不放宽来源，也不要求用户关闭浏览器安全功能。

浏览器还可能限制混合内容／本地网络权限。尚未完成各浏览器从公开 HTTPS 页访问回环 WebSocket 的权限矩阵验证；本地 HTTP 网页 + 本机桥接是本版验证的传输路径。传输检查使用无设备夹具，不代表真实 Neon 已联调。

### 项目与第三方许可

仓库没有项目整体 LICENSE，许可尚待作者确定，本次未自行选取。源代码公开不等于所有用途已有授权。p5.js 的 LGPL-2.1 仅适用于该依赖。依赖清单、上游与许可见 [THIRD_PARTY.md](THIRD_PARTY.md)；贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

全新依赖安装检查发现上游 `pupil-labs-video` 导入需要 `packaging`，已显式补入 requirements。macOS 上 OpenCV 与 PyAV 同时载入可能输出重复 AVF 类警告，本轮测试通过，真实码流与跨平台兼容仍需验证。
