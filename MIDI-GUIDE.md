# Donut MIDI · 八键演奏

本地入口：`http://127.0.0.1:8088/index.html?v=midi-1&neon=1`。

## 八个甜甜圈

两排，每排四个。上排：C4 D4 E4 F4；下排：G4 A4 B4 C5。它是 C 大调自然音八度，不是完整半音键盘；后者需要 12 个音级（含重复高音主音为 13 个键）。MIDI 协议支持音符编号 0–127，不限定实体键数。

旧七键/三键桌垫不能配合新版区域使用。使用新版 `mat.svg` 摆放实体甜甜圈或 `monitor-mat.svg` 屏幕图。保持四角可见。旧分支与已提交版本仍保留。

## 音色和持续声部

- 旋律音色：程序合成钢琴、Karplus–Strong 风格拨弦吉他、合成器。不是录制的真实乐器音源；可上传自己的采样替换。
- 每个区域的自选音频仍优先，八轨均可独立加载。更改音高不会移调上传音频。
- 点击“开始双声部演奏”会连接实时眼动并手动选择 focus。点击“专注循环”也可开启；它是用户选择，不是心理分类结果。
- 专注伴奏按节拍重复 C–Am–F–G 和弦进行；可选择吉他扫弦、合成器和弦或钢琴分解。速度 40–160 BPM。
- “跟随我的感受标记”保持至手动改变；没有 30 秒自动过期。
- 可选“跟随眼动创作曲线”：候选声区连续稳定 8 秒才改变伴奏。8 秒是音乐交互参数，不是科学诊断阈值。
- 总暂停、后台、断线、未佩戴、定位丢失或非演奏阶段会停止伴奏。再次有效时按选择恢复。“停止全部声音”同时关闭伴奏与 MIDI 音符。

## 外部 MIDI

点击“启用 MIDI 输出”，同意浏览器权限，然后选择端口。发送旋律通道 1 与伴奏通道 2；所选音色会发送 GM Program Change（钢琴 0、尼龙吉他 24、warm pad 89，零基编号）。DAW 不一定采用 GM 音色，需要在接收软件加载想要的乐器。

macOS 可以在“音频 MIDI 设置”的 MIDI 工作室中启用 IAC 驱动，再用支持 Web MIDI 的浏览器打开本地页面。GarageBand 加载软件乐器轨道；是否按通道分轨取决于接收软件配置，未在当前电脑上实测。可取消“同时播放浏览器音色”避免本地与 DAW 双重发声。

本版只发送音符控制消息，不向 DAW 传送上传的音频、不导出 .mid 文件。未选择输出端口不会发送任何外部 MIDI。输入端口无需授权；请求 sysex=false。

## 研究跟奏采集

在研究面板勾选本机采集同意后，执行 45 秒参考观看与六段 30 秒跟奏。短旋律保持显示；记忆任务的提示在 6 秒后隐藏。任务序列是工程试点协议，尚未做顺序平衡实验。每段结束分别标记注意、困惑、卡住、费力，允许混合／不确定。

采集期间关闭伴奏与状态声、暂用统一合成钢琴；任务错误不自动变成困惑标签。参考段至少有 150 个有效瞳孔样本才设置参考值。保存样本、目标/实际音符与自述；导出 JSON 不含视频或音频。数据仅保留在当前浏览器内存，可随时结束并导出。切后台或切换输入会中断正在进行的区块。

模型仍为 untrained；此版没有伪造模型权重或概率。原生 fixation/blink、高频采集、训练与跨会话验证尚未实现；现阶段的约 30 Hz 桌垫数据不能当作这些原生事件。具体研究方案见 `research/SCIENTIFIC-MODE.md`。

## Continuous state soundscapes (2026-09-30)

Sound → Accompaniment instrument defaults to Continuous state soundscapes. Self-report holds the selected sound until changed: relaxed = synthesized birds and breeze, focused = steady rain, stressed = low wind, confused = swirling filtered-water texture. These are procedural Web Audio textures, not field recordings or clinical signatures. State changes crossfade for about two seconds; Stop all sound stops immediately. AOI melody notes and uploaded melody clips remain independent. MIDI carries melody / optional musical accompaniment, not these environmental textures.

The four sound buttons unlock audio and select a self-report. Creative gaze mapping remains an explicitly labeled alternative with an eight-second stability gate; no validated cognitive classifier is implied. Background tabs, research/reference capture, stale or unworn live input pause playback. Soundscapes do not require mat localization, so momentarily looking away from the score does not itself silence the chosen state.
