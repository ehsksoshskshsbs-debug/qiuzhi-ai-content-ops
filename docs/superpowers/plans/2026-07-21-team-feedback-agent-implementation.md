# 团队反馈与运营数据工作台实施计划

日期：2026-07-21  
依据：`docs/superpowers/specs/2026-07-21-team-feedback-agent-design.md`

## 目标

在现有 `/ops` 云端工作台上增量完成团队角色、AI 摘要与情绪建议、人工确认、列表＋详情布局和并发保护。保留已存在的 D1、ChatGPT 登录、CSV、运营指标和审计能力。

## 任务 1：扩展数据模型与迁移

涉及文件：

- `site/db/schema.ts`
- `site/db/index.ts`
- `site/drizzle/*`

实施内容：

1. 新增 `workspace_members`，保存工作区、邮箱、显示名、角色和启用状态；
2. 为反馈增加脱敏原始内容、AI 摘要、AI 情绪和版本字段；
3. 保持现有记录可读，将缺失的脱敏原始内容回退为已有摘要；
4. 从 `OPS_ALLOWED_EMAILS` 初始化成员，首个邮箱为管理员，其余为成员；
5. 生成并检查 Drizzle 迁移。

验证：数据库初始化可重复执行；旧记录不丢失；工作区与成员唯一约束有效。

## 任务 2：实现角色授权和团队接口

涉及文件：

- `site/app/ops-auth.ts`
- `site/app/api/ops/team/route.ts`
- 各写入接口

实施内容：

1. `getOpsAccess` 返回成员角色；
2. 管理员可以新增、调整或停用成员；
3. 成员可以写入业务数据，只读成员只能查询和导出；
4. 所有权限在服务端检查，前端按钮隐藏只作为体验优化；
5. 成员管理动作写入审计记录。

验证：未登录、非成员、只读、成员和管理员五类权限路径均有接口测试。

## 任务 3：扩展 AI 建议与人工确认

涉及文件：

- `site/lib/ai-feedback-classifier.ts`
- `site/lib/feedback-repository.ts`
- `site/app/api/ops/feedback/[id]/classify/route.ts`
- `site/app/api/ops/feedback/[id]/classification-review/route.ts`

实施内容：

1. 使用 Responses API 严格 JSON Schema 返回摘要、情绪、标签、优先级、理由和置信度；
2. 只发送服务端脱敏后的内容，设置 `store: false`；
3. AI 字段与正式字段分开保存；
4. 人工确认时一次性接受或修改四个建议字段，并写入审计事件；
5. 拒答、超时、非法输出和服务不可用时允许继续人工处理。

验证：结构化输出解析、隐私脱敏、失败降级和人工确认均有自动化测试。

## 任务 4：补充并发保护与重复提示

涉及文件：

- `site/lib/ops-domain.ts`
- `site/lib/feedback-repository.ts`
- `site/app/api/ops/feedback/[id]/route.ts`

实施内容：

1. 编辑提交携带读取时的版本号；
2. 服务端只在版本匹配时更新，否则返回冲突状态；
3. 保留平台记录编号唯一约束；
4. 无平台编号时生成脱敏内容指纹，明确重复阻止写入。

验证：并发旧版本更新返回冲突；重复记录不会静默增加。

## 任务 5：改造工作台为列表＋详情

涉及文件：

- `site/app/ops/workbench.tsx`
- `site/app/ops/ops.css`
- `site/app/ops/page.tsx`

实施内容：

1. 桌面端左侧为筛选和反馈列表，右侧为当前详情与 AI 建议；
2. 保留新增表单，编辑和 AI 确认在详情区完成；
3. 增加“反馈、运营数据、团队”工作区导航；
4. 只读成员显示权限提示并禁用写操作；
5. 手机端列表与详情切换，支持键盘和触摸操作；
6. 输入或保存失败时保留表单内容。

验证：无记录、加载中、失败、待审核、低置信度和只读状态均可识别。

## 任务 6：团队与运营数据界面

涉及文件：

- `site/app/ops/workbench.tsx`
- `site/app/ops/ops.css`
- `site/app/api/ops/team/route.ts`

实施内容：

1. 管理员可查看、添加、调整角色和停用成员；
2. 非管理员可查看团队名单但不能修改；
3. 保留并整理现有运营指标录入与历史明细；
4. 连接器继续显示“待接入”，不伪造平台同步。

验证：团队变更即时更新，指标录入仍保持唯一更新语义。

## 任务 7：完整验证与发布

涉及文件：

- `site/tests/rendered-html.test.mjs`
- `site/.openai/hosting.json`
- `site/.env.example`

实施内容：

1. 扩展端到端接口测试；
2. 运行 lint、测试和生产构建；
3. 检查 D1 迁移和部署包；
4. 使用 Sites 保存版本并进行私有部署；
5. 验证登录、录入、AI 建议、人工确认、角色限制和指标保存关键路径。

完成条件：规格中的验收标准全部满足，且公开作品集页面没有引入真实运营数据。
