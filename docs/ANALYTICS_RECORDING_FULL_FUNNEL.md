# Memo 录音全链路埋点方案

## 1. 方案目标

本方案覆盖一条录音从入口曝光、录制、实时转写、AI 分析、时间锚点对齐、保存到 Memo，到后续查看、回听和复习的完整生命周期。

埋点需要回答四类问题：

1. 用户是否能顺利完成一条有效录音？失败发生在哪一步？
2. 实时转写和 AI 分析是否及时、稳定、可信？
3. 录音是否成功沉淀到 Memo，用户能否找到并再次使用？
4. AI 洞察、知识点和原录音锚点是否真正降低了回听与复习成本？

## 2. 数据模型与唯一标识

### 2.1 核心 ID

| 字段 | 生成时机 | 生命周期 | 说明 |
|---|---|---|---|
| `user_id` | 登录后 | 用户级 | 匿名用户使用稳定的 `anonymous_id` |
| `session_id` | 打开产品或会话过期后 | 会话级 | 用于分析一次连续使用过程 |
| `recording_id` | 用户点击录音入口并创建录音草稿时 | 单条录音全生命周期 | 录、转写、分析、保存、消费必须使用同一个 ID |
| `recording_attempt_id` | 每次尝试启动录音时 | 单次启动尝试 | 权限失败后重试需生成新 attempt，`recording_id` 不变 |
| `transcript_id` | 转写任务创建时 | 单次转写任务 | 实时转写与结束后的最终转写可用不同 task ID |
| `analysis_id` | AI 分析任务创建时 | 单次分析任务 | 重试分析时生成新 ID |
| `segment_id` | 转写片段稳定时 | 转写片段级 | 对应一段带起止时间和说话人的文本 |
| `insight_id` | AI 洞察首次生成时 | 单条洞察级 | 洞察更新时 ID 不变，增加 `insight_version` |
| `knowledge_point_id` | 最终知识点生成时 | 知识点级 | 可关联一个或多个 segment |
| `note_id` | 成功写入 Memo 时 | Memo 内容级 | 用于串联保存后的查看和复习 |
| `playback_session_id` | 每次开始播放时 | 单次播放会话 | 暂停后短时间继续可沿用，重新打开则新建 |

### 2.2 关键时间口径

| 字段 | 定义 |
|---|---|
| `client_event_time` | 客户端事件实际发生时间，ISO 8601 |
| `server_received_time` | 服务端收到事件时间 |
| `recording_start_time` | 音频采集真正开始，不是点击按钮时间 |
| `recording_end_time` | 音频采集真正结束 |
| `audio_duration_ms` | 实际有效音频时长，不包含暂停时长 |
| `elapsed_duration_ms` | 从开始到完成的自然时间，包含暂停 |
| `processing_duration_ms` | 处理开始到成功/失败的耗时 |

所有延迟优先使用单调时钟在端内计算，避免设备时间修改造成负值。

## 3. 公共属性

所有事件默认携带以下字段；没有值时传 `null`，不要传空字符串。

### 3.1 用户与环境

| 字段 | 类型 | 示例/枚举 | 说明 |
|---|---|---|---|
| `user_id` | string/null | `u_123` | 登录用户 ID |
| `anonymous_id` | string | `anon_xxx` | 匿名设备标识 |
| `session_id` | string | `s_xxx` | 当前使用会话 |
| `client_type` | enum | `web` / `desktop` / `ios` / `android` | 客户端类型 |
| `app_version` | string | `1.6.0` | 产品版本 |
| `os` | string | `macOS` | 操作系统 |
| `browser` | string/null | `Chrome 128` | 浏览器及版本 |
| `device_type` | enum | `desktop` / `tablet` / `mobile` | 设备类型 |
| `locale` | string | `zh-CN` | 语言区域 |
| `network_type` | enum | `wifi` / `cellular` / `ethernet` / `offline` / `unknown` | 网络环境 |

### 3.2 录音上下文

| 字段 | 类型 | 示例/枚举 | 说明 |
|---|---|---|---|
| `recording_id` | string | `rec_xxx` | 录音主键 |
| `recording_attempt_id` | string/null | `attempt_xxx` | 当前启动尝试 |
| `recording_phase` | enum | `idle` / `requesting_permission` / `recording` / `paused` / `processing` / `completed` / `saving` / `saved` / `failed` / `discarded` | 事件发生时状态 |
| `entry_source` | enum | `sidebar` / `add_menu` / `course` / `memo_note` / `oobe` / `floating_widget` | 发起来源 |
| `subject_id` | string/null | `physics` | 当前关联学科 |
| `course_id` | string/null | `course_xxx` | 当前关联课程 |
| `auto_save_enabled` | boolean | `true` | 当时是否开启自动保存 |
| `is_first_recording` | boolean | `false` | 用户是否首次创建录音 |
| `is_new_recording_after_complete` | boolean | `true` | 是否从“开始新录音”发起 |
| `previous_recording_id` | string/null | `rec_prev` | 新录音的上一条录音 |

### 3.3 服务与实验

| 字段 | 类型 | 说明 |
|---|---|---|
| `asr_provider` | string/null | 转写服务及模型版本 |
| `analysis_model` | string/null | AI 分析模型版本 |
| `diarization_model` | string/null | 说话人分离模型版本 |
| `prompt_version` | string/null | AI 洞察/总结 Prompt 版本 |
| `experiment_ids` | array | 命中的实验和分组，如 `insight_ui_v2:B` |
| `schema_version` | string | 埋点结构版本，首版为 `1.0` |

## 4. 事件命名规范

- 格式：`recording_<对象>_<动作或结果>`。
- 用户行为使用过去式动作，如 `recording_pause_clicked`。
- 系统结果明确区分 `started`、`succeeded`、`failed`。
- 曝光事件只有元素进入可视区域且持续至少 500ms 才上报。
- 高频流式过程不可逐 token 上报；使用聚合心跳或阶段事件。
- 同一成功/失败事件只能上报一次；重试通过新的 task/attempt ID 区分。

## 5. 全链路事件清单

### 5.1 入口、弹窗与权限

| 事件名 | 触发时机 | 必传业务属性 |
|---|---|---|
| `recording_entry_exposed` | 录音入口可见 ≥ 500ms | `entry_source`, `element_position` |
| `recording_entry_clicked` | 用户点击录音入口 | `entry_source` |
| `recording_modal_opened` | 录音弹窗完成渲染 | `open_latency_ms`, `has_existing_recording` |
| `recording_start_clicked` | 点击开始录音 | `recording_attempt_id` |
| `recording_permission_prompted` | 系统麦克风权限请求被唤起 | `permission_status_before` |
| `recording_permission_resolved` | 权限请求返回 | `permission_result: granted/denied/dismissed/restricted`, `permission_latency_ms` |
| `recording_device_selected` | 确定输入设备或用户切换设备 | `device_id_hash`, `device_label_available`, `is_default_device` |
| `recording_start_succeeded` | 音频流开始产生有效数据 | `startup_latency_ms`, `sample_rate`, `channel_count`, `codec` |
| `recording_start_failed` | 启动录音失败 | `failure_stage`, `error_code`, `error_message_group`, `is_retryable` |

补充口径：

- `startup_latency_ms` = 音频采集开始时间 − `recording_start_clicked` 时间。
- 用户拒绝权限同时上报 `recording_permission_resolved`，并在无法启动时上报 `recording_start_failed`。
- `error_message_group` 只传归类后的错误，不上传系统原始堆栈或用户隐私。

### 5.2 录音控制与质量

| 事件名 | 触发时机 | 必传业务属性 |
|---|---|---|
| `recording_pause_clicked` | 点击暂停 | `audio_duration_ms`, `elapsed_duration_ms`, `pause_index` |
| `recording_paused` | 实际停止采集 | `pause_latency_ms`, `pause_index` |
| `recording_resume_clicked` | 点击继续 | `pause_index`, `current_pause_duration_ms` |
| `recording_resumed` | 音频重新开始写入 | `resume_latency_ms`, `pause_index` |
| `recording_minimized` | 收起为悬浮态 | `audio_duration_ms`, `transcript_char_count`, `insight_count` |
| `recording_expanded` | 从悬浮态恢复 | `minimized_duration_ms`, `expand_source` |
| `recording_quality_warning_shown` | 出现低音量、爆音、设备断开等提示 | `warning_type`, `audio_duration_ms`, `signal_level` |
| `recording_device_interrupted` | 麦克风被系统/其他应用中断 | `interruption_type`, `recoverable` |
| `recording_device_recovered` | 中断后恢复 | `interruption_duration_ms`, `recovery_method` |
| `recording_complete_clicked` | 用户点击完成录音 | `audio_duration_ms`, `elapsed_duration_ms`, `pause_count`, `transcript_char_count`, `insight_count` |
| `recording_capture_completed` | 音频采集完全结束且文件可用 | `complete_reason`, `audio_duration_ms`, `file_size_bytes`, `pause_count` |
| `recording_capture_failed` | 录制中异常失败 | `error_code`, `failure_stage`, `audio_duration_ms`, `local_audio_available`, `is_retryable` |
| `recording_discard_prompted` | 未完成录音时尝试关闭 | `trigger: close/refresh/navigate`, `audio_duration_ms` |
| `recording_discard_cancelled` | 选择继续保留/继续录音 | `trigger` |
| `recording_discard_confirmed` | 确认放弃录音 | `trigger`, `audio_duration_ms`, `discard_reason` |
| `recording_new_clicked` | 完成后点击开始新录音 | `previous_recording_id`, `previous_saved`, `previous_audio_duration_ms` |
| `recording_sidebar_item_created` | 新录音出现在左侧列表 | `list_index`, `auto_selected`, `scrolled_into_view` |

建议每 60 秒上报一次 `recording_runtime_heartbeat`，用于识别长录音异常退出。属性包括：`audio_duration_ms`、`elapsed_duration_ms`、`pause_count`、`audio_bytes_written`、`transcript_status`、`analysis_status`。页面后台时可降频，不可每秒上报。

### 5.3 实时转写

| 事件名 | 触发时机 | 必传业务属性 |
|---|---|---|
| `recording_transcription_requested` | 实时转写任务创建 | `transcript_id`, `language`, `asr_provider` |
| `recording_transcription_connected` | 与实时转写服务连接成功 | `transcript_id`, `connection_latency_ms` |
| `recording_transcript_first_partial` | 首次出现临时转写 | `transcript_id`, `latency_from_recording_start_ms`, `char_count` |
| `recording_transcript_first_stable` | 首段稳定转写生成 | `transcript_id`, `latency_from_recording_start_ms`, `segment_id`, `confidence` |
| `recording_transcript_segment_stable` | 每个稳定段落生成 | `segment_id`, `segment_index`, `start_ms`, `end_ms`, `char_count`, `confidence`, `speaker_role`, `speaker_confidence` |
| `recording_transcript_role_updated` | 最终处理修正说话人角色 | `segment_id`, `role_before`, `role_after`, `speaker_confidence` |
| `recording_transcription_interrupted` | 实时转写连接中断 | `error_code`, `last_stable_segment_index`, `recording_continues` |
| `recording_transcription_recovered` | 自动重连或补传成功 | `interruption_duration_ms`, `recovery_method`, `segments_backfilled` |
| `recording_transcription_finalization_started` | 停止录音后开始最终转写 | `transcript_id`, `partial_segment_count` |
| `recording_transcription_finalization_succeeded` | 最终文稿生成 | `stable_segment_count`, `char_count`, `speaker_count`, `teacher_segment_count`, `student_segment_count`, `processing_duration_ms`, `average_confidence` |
| `recording_transcription_failed` | 实时或最终转写失败 | `stage: realtime/final`, `error_code`, `is_retryable`, `audio_available` |
| `recording_transcript_tab_clicked` | 用户切换到实时/完整转写 | `from_tab`, `recording_phase` |
| `recording_transcript_scrolled` | 首次主动滚动转写区 | `scroll_depth_percent`, `recording_phase` |

隐私要求：埋点不得上传完整转写文本。调试所需样例必须走单独、受控且脱敏的数据链路。常规事件只上传字符数、段落数、置信度、语言、角色等元数据。

### 5.4 AI 实时分析与洞察

| 事件名 | 触发时机 | 必传业务属性 |
|---|---|---|
| `recording_analysis_requested` | 首次创建实时分析任务 | `analysis_id`, `analysis_model`, `prompt_version` |
| `recording_analysis_started` | 模型开始处理稳定转写 | `analysis_id`, `source_segment_count` |
| `recording_insight_first_generated` | 首条有效洞察出现 | `insight_id`, `insight_type`, `latency_from_recording_start_ms`, `source_segment_count`, `confidence` |
| `recording_insight_generated` | 生成一条新洞察 | `insight_id`, `insight_type`, `insight_version`, `source_segment_count`, `approx_anchor_ms`, `confidence` |
| `recording_insight_updated` | 实时洞察被补充或修正 | `insight_id`, `version_before`, `version_after`, `update_reason`, `source_segment_count` |
| `recording_insight_merged` | 多条重复洞察被合并 | `target_insight_id`, `merged_insight_count`, `merge_reason` |
| `recording_insight_removed` | 低置信或失去证据的洞察被撤回 | `insight_id`, `remove_reason`, `last_confidence` |
| `recording_analysis_interrupted` | AI 分析暂时中断 | `error_code`, `last_processed_segment_index`, `recording_continues` |
| `recording_analysis_recovered` | 分析恢复 | `interruption_duration_ms`, `recovery_method` |
| `recording_analysis_failed` | 实时分析最终失败 | `error_code`, `is_retryable`, `transcript_available` |
| `recording_insight_tab_clicked` | 切换到 AI 洞察 | `from_tab`, `recording_phase`, `insight_count` |
| `recording_insight_exposed` | 单条洞察进入视口 ≥ 500ms | `insight_id`, `insight_type`, `recording_phase`, `is_clickable` |
| `recording_insight_clicked_while_locked` | 录音中点击不可回听洞察（若 UI 接收点击） | `insight_id`, `recording_phase`, `lock_reason` |

`insight_type` 统一枚举：`key_point`、`risk`、`question`、`task`、`example`、`conclusion`。不要使用展示文案作为枚举值。

### 5.5 完成后的总结、知识点与锚点对齐

| 事件名 | 触发时机 | 必传业务属性 |
|---|---|---|
| `recording_final_analysis_started` | 完整转写完成后开始最终分析 | `analysis_id`, `segment_count`, `audio_duration_ms` |
| `recording_summary_generated` | 内容摘要生成成功 | `summary_char_count`, `processing_duration_ms`, `source_segment_count` |
| `recording_knowledge_points_generated` | 核心知识点生成成功 | `knowledge_point_count`, `multi_segment_point_count`, `processing_duration_ms` |
| `recording_insights_finalized` | 实时洞察合并、修正完成 | `realtime_count`, `final_count`, `merged_count`, `removed_count`, `updated_count` |
| `recording_alignment_started` | 开始将洞察/知识点映射到音频 | `insight_count`, `knowledge_point_count` |
| `recording_alignment_succeeded` | 所有可用锚点完成 | `aligned_insight_count`, `aligned_knowledge_point_count`, `unaligned_count`, `processing_duration_ms`, `average_confidence` |
| `recording_alignment_partially_succeeded` | 部分锚点生成 | `aligned_count`, `unaligned_count`, `failure_reason_group` |
| `recording_alignment_failed` | 无法生成锚点 | `error_code`, `segment_count`, `audio_available`, `is_retryable` |
| `recording_processing_completed` | 转写、分析、对齐全部到达终态 | `overall_result`, `total_processing_duration_ms`, `transcript_result`, `analysis_result`, `alignment_result` |

最终分析事件不得上传摘要或知识点正文；只记录数量、长度、置信度和关系数量。

### 5.6 播放器与锚点回听

| 事件名 | 触发时机 | 必传业务属性 |
|---|---|---|
| `recording_player_play_clicked` | 用户点击播放 | `playback_session_id`, `current_position_ms`, `play_source` |
| `recording_player_started` | 音频实际开始播放 | `playback_session_id`, `start_latency_ms`, `start_position_ms` |
| `recording_player_paused` | 用户暂停 | `playback_session_id`, `position_ms`, `played_duration_ms` |
| `recording_player_seeked` | 拖动播放器进度 | `from_ms`, `to_ms`, `seek_source: progress_bar` |
| `recording_anchor_clicked` | 点击洞察/知识点/转写时间点 | `anchor_type`, `object_id`, `target_ms`, `related_segment_count`, `recording_phase` |
| `recording_anchor_seek_succeeded` | 播放器成功定位 | `anchor_type`, `object_id`, `target_ms`, `actual_ms`, `deviation_ms`, `seek_latency_ms`, `auto_play` |
| `recording_anchor_seek_failed` | 锚点定位失败 | `anchor_type`, `object_id`, `target_ms`, `error_code` |
| `recording_related_segment_clicked` | 切换同一知识点的其他片段 | `knowledge_point_id`, `segment_id`, `segment_role: first_explanation/supplement/example` |
| `recording_player_completed` | 播放到音频结尾 | `playback_session_id`, `played_duration_ms`, `completion_percent` |

`play_source` 枚举：`recording_modal`、`memo_note`、`transcript`、`insight`、`knowledge_point`、`search_result`。

### 5.7 自动保存设置与保存到 Memo

| 事件名 | 触发时机 | 必传业务属性 |
|---|---|---|
| `recording_auto_save_exposed` | 顶部自动保存开关可见 | `enabled` |
| `recording_auto_save_toggled` | 用户切换开关 | `from_enabled`, `to_enabled`, `recording_phase` |
| `recording_save_triggered` | 保存流程被触发 | `trigger: auto/manual/retry`, `analysis_ready`, `alignment_ready` |
| `recording_save_started` | 开始上传音频并写入 Memo | `save_task_id`, `audio_upload_required`, `file_size_bytes` |
| `recording_audio_upload_succeeded` | 原音频上传成功 | `save_task_id`, `upload_duration_ms`, `file_size_bytes` |
| `recording_audio_upload_failed` | 原音频上传失败 | `save_task_id`, `error_code`, `uploaded_bytes`, `is_retryable` |
| `recording_memo_write_succeeded` | Memo 记录写入成功 | `save_task_id`, `note_id`, `memo_path`, `subject_id`, `has_audio`, `has_transcript`, `has_summary`, `knowledge_point_count`, `insight_count` |
| `recording_save_succeeded` | 音频与 Memo 写入达到最终成功态 | `note_id`, `save_duration_ms`, `trigger`, `memo_path`, `new_badge_created` |
| `recording_save_failed` | 保存最终失败 | `failure_stage`, `error_code`, `local_backup_available`, `is_retryable` |
| `recording_save_retry_clicked` | 用户点击重试 | `previous_error_code`, `retry_index` |
| `recording_save_toast_shown` | 保存成功 Toast 展示 | `note_id`, `memo_path`, `auto_dismiss_ms` |
| `recording_save_toast_clicked` | 点击 Toast | `action: view/close`, `visible_duration_ms` |
| `recording_save_toast_dismissed` | Toast 自动或手动消失 | `dismiss_reason: timeout/manual/navigation`, `visible_duration_ms` |

`memo_path` 只传结构化位置 ID 或规范化路径，例如 `subject:physics/module:notes`，不传可能包含隐私的用户自定义标题。

### 5.8 Memo 内展示与后续消费

| 事件名 | 触发时机 | 必传业务属性 |
|---|---|---|
| `recording_memo_new_badge_exposed` | 左侧学科或笔记卡片 NEW 标识可见 | `note_id`, `badge_location: sidebar/card`, `age_since_save_ms` |
| `recording_memo_card_exposed` | 录音生成的 Memo 卡片可见 | `note_id`, `source_recording_id`, `is_new` |
| `recording_memo_card_clicked` | 点击录音 Memo 卡片 | `note_id`, `is_new`, `age_since_save_ms`, `entry_source` |
| `recording_memo_opened` | 右侧抽屉完成展示 | `note_id`, `open_latency_ms`, `default_tab`, `is_new` |
| `recording_memo_new_badge_cleared` | 首次打开后 NEW 消失 | `note_id`, `badge_locations_cleared` |
| `recording_memo_tab_clicked` | 切换智能笔记/完整转写 | `note_id`, `from_tab`, `to_tab` |
| `recording_memo_section_exposed` | 摘要、知识点、洞察等进入视口 | `note_id`, `section_type`, `scroll_depth_percent` |
| `recording_original_audio_clicked` | 点击查看原录音 | `note_id`, `source_section`, `anchor_object_id`, `target_ms` |
| `recording_knowledge_point_clicked` | 点击核心知识点 | `note_id`, `knowledge_point_id`, `related_segment_count`, `action: expand/play` |
| `recording_used_for_review` | 录音知识进入复习流程 | `note_id`, `knowledge_point_count`, `review_entry` |
| `recording_used_for_search` | 搜索结果命中该录音记忆并被点击 | `note_id`, `result_rank`, `query_type` |
| `recording_used_for_qa` | 用户基于该录音发起问答 | `note_id`, `selected_context_type` |

## 6. 失败事件统一属性

所有 `*_failed` 事件必须包含：

| 字段 | 说明 |
|---|---|
| `error_code` | 稳定、可聚合的业务错误码 |
| `error_category` | `permission` / `device` / `network` / `timeout` / `provider` / `quota` / `validation` / `storage` / `unknown` |
| `failure_stage` | 失败所在阶段 |
| `is_retryable` | 当前错误是否允许重试 |
| `retry_index` | 当前为第几次尝试，从 0 开始 |
| `fallback_used` | 是否启用降级方案 |
| `user_visible_message_code` | 展示给用户的提示文案编码，不传完整文案 |
| `local_data_available` | 本地是否仍保留音频/转写，可否恢复 |

禁止把 access token、音频内容、完整转写、用户名、文件路径或原始服务端异常堆栈写入埋点。

## 7. 核心指标口径

### 7.1 录音漏斗

| 指标 | 计算公式 |
|---|---|
| 入口点击率 | 去重用户 `recording_entry_clicked` / `recording_entry_exposed` |
| 启动转化率 | 去重 `recording_start_succeeded.recording_id` / `recording_start_clicked.recording_id` |
| 权限通过率 | `permission_result=granted` / `recording_permission_prompted` |
| 有效录音率 | `audio_duration_ms ≥ 10000` 的 `recording_capture_completed` / `recording_start_succeeded` |
| 录音完成率 | `recording_capture_completed` / `recording_start_succeeded` |
| 放弃率 | `recording_discard_confirmed` / `recording_start_succeeded` |

### 7.2 转写与 AI 质量

| 指标 | 计算公式/口径 |
|---|---|
| 实时转写启动率 | `recording_transcript_first_partial` / `recording_start_succeeded` |
| 首字延迟 P50/P90/P95 | `latency_from_recording_start_ms` 分位数 |
| 最终转写成功率 | `recording_transcription_finalization_succeeded` / `recording_capture_completed` |
| 说话人识别覆盖率 | `speaker_role != unknown` 的稳定片段 / 全部稳定片段 |
| AI 洞察生成率 | 至少 1 条洞察的 recording / 有最终转写的 recording |
| 首洞察延迟 | `recording_insight_first_generated` 距录音开始时间 |
| 洞察保留率 | 最终保留洞察数 / 实时生成洞察数 |
| 锚点对齐成功率 | 已对齐对象数 / 应对齐洞察与知识点数 |

### 7.3 保存与价值指标

| 指标 | 计算公式 |
|---|---|
| 保存到 Memo 成功率 | `recording_save_succeeded` / `recording_capture_completed` |
| 自动保存成功率 | `trigger=auto` 的成功数 / `trigger=auto` 的触发数 |
| 保存耗时 P95 | `recording_save_succeeded.save_duration_ms` P95 |
| 保存后打开率 | 保存后 7 天内有 `recording_memo_opened` 的 recording / `recording_save_succeeded` |
| 锚点使用率 | 有 `recording_anchor_clicked` 的 recording / 有成功对齐的 recording |
| 锚点跳转成功率 | `recording_anchor_seek_succeeded` / `recording_anchor_clicked` |
| 回听效率 | 锚点播放会话占全部播放会话比例；及首次目标内容播放前的平均 seek 次数 |
| 复习转化率 | 保存后 30 天内 `recording_used_for_review` / `recording_save_succeeded` |
| 知识复用率 | 30 天内至少发生搜索、复习或问答任一行为的 note / 保存成功 note |

## 8. 推荐分析漏斗

### 8.1 主成功漏斗

```text
recording_entry_clicked
→ recording_start_succeeded
→ recording_transcript_first_stable
→ recording_insight_first_generated
→ recording_capture_completed
→ recording_processing_completed(overall_result=success/partial_success)
→ recording_save_succeeded
→ recording_memo_opened
→ recording_anchor_clicked / recording_used_for_review
```

建议按 `entry_source`、新老用户、学科、客户端、录音时长区间、网络、模型版本和实验组分层。

### 8.2 技术稳定性漏斗

```text
start_clicked
→ permission_granted
→ capture_started
→ transcription_connected
→ final_transcription_succeeded
→ final_analysis_completed
→ alignment_succeeded
→ audio_upload_succeeded
→ memo_write_succeeded
```

### 8.3 洞察价值漏斗

```text
insight_exposed
→ recording_completed
→ insight_finalized
→ anchor_clicked
→ anchor_seek_succeeded
→ played_duration_ms ≥ 5s
→ knowledge_point_clicked / used_for_review
```

## 9. 状态快照与宽表建议

除行为事件外，建议在录音到达终态时生成一行 `recording_fact`，减少复杂漏斗查询。

核心字段：

- 身份与来源：`recording_id`、`user_id`、`entry_source`、`subject_id`。
- 录音结果：开始/结束时间、有效时长、暂停次数、完成原因、是否放弃。
- 转写结果：是否成功、首字延迟、段落数、字符数、说话人数、平均置信度。
- AI 结果：洞察数、知识点数、首洞察延迟、实时洞察保留率。
- 对齐结果：成功锚点数、失败数、平均置信度、耗时。
- 保存结果：自动/手动、是否成功、note_id、保存耗时、失败阶段。
- 消费结果：7/30 天是否打开、是否回听锚点、是否搜索、复习、问答。

状态事实表必须由服务端或离线任务基于事件聚合生成，不由客户端重复上报最终结论。

## 10. 数据质量与验收规则

### 10.1 顺序与唯一性

- 一个 `recording_attempt_id` 最多有一个 `recording_start_succeeded`。
- 一个 `recording_id` 最多有一个最终 `recording_capture_completed` 或 `recording_discard_confirmed`。
- 一个 `save_task_id` 最多有一个最终成功或失败事件。
- `recording_save_succeeded` 必须能关联到 `note_id`。
- `recording_anchor_seek_succeeded` 必须存在更早或同批次的 `recording_anchor_clicked`。
- `recording_new_clicked.previous_recording_id` 不能等于新生成的 `recording_id`。

### 10.2 数值校验

- 所有 duration、latency、position 字段必须 ≥ 0。
- `segment.start_ms < segment.end_ms ≤ audio_duration_ms + 容差`。
- `actual_ms` 与 `target_ms` 的绝对差值生成 `deviation_ms`。
- `aligned_count + unaligned_count` 应等于待对齐对象总数。
- `teacher_segment_count + student_segment_count + unknown_segment_count = stable_segment_count`。

### 10.3 上报策略

- 核心成功/失败事件实时上报并落本地队列，网络恢复后补传。
- 高频事件批量上报；心跳频率默认 60 秒。
- 曝光事件在一次页面会话内同对象最多上报一次，除非离开视口 30 秒后重新进入。
- 客户端生成 `event_id`，服务端按 event_id 去重。
- 离线补传携带 `is_offline_replay=true` 和原始 `client_event_time`。

### 10.4 发布验收

上线前需验证：

1. 录音成功、权限拒绝、暂停继续、异常中断、放弃、新录音六条路径均可完整串联。
2. 实时转写失败但录音成功时，失败与后续补转写事件均正确。
3. 录音中洞察不可回听；完成对齐后锚点点击、跳转成功事件成对出现。
4. 自动保存开启、关闭及保存重试三条路径可以区分。
5. 保存成功后能通过 `recording_id → note_id` 串联 Memo 卡片、NEW 标识和后续消费。
6. 事件中不出现音频、完整转写或用户自定义标题等敏感正文。
7. 关键事件丢失率低于 0.5%，重复率低于 0.1%，异常顺序率低于 0.1%。

## 11. 最小首发事件集

若研发需要分期，首发至少保证以下事件：

1. `recording_entry_clicked`
2. `recording_start_clicked`
3. `recording_permission_resolved`
4. `recording_start_succeeded` / `recording_start_failed`
5. `recording_pause_clicked` / `recording_resume_clicked`
6. `recording_capture_completed` / `recording_discard_confirmed`
7. `recording_transcript_first_stable`
8. `recording_transcription_finalization_succeeded` / `recording_transcription_failed`
9. `recording_insight_first_generated`
10. `recording_processing_completed`
11. `recording_alignment_succeeded` / `recording_alignment_failed`
12. `recording_auto_save_toggled`
13. `recording_save_triggered`
14. `recording_save_succeeded` / `recording_save_failed`
15. `recording_memo_opened`
16. `recording_anchor_clicked`
17. `recording_anchor_seek_succeeded` / `recording_anchor_seek_failed`
18. `recording_used_for_review`

首发后再补充片段级、曝光级与性能诊断事件，避免第一版因为事件过多影响研发排期。
