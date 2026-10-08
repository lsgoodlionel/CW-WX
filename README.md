# 小企业财务记账系统 · 微信小程序独立版

用 **Taro 4 + React 18 + TypeScript** 实现的微信小程序端,与主仓库
[lsgoodlionel/CW](https://github.com/lsgoodlionel/CW) 的 Web 前端功能对等,
**复用同一套 FastAPI 后端与同一个数据库**,不改动任何后端代码。

> 本仓库是自包含的:`npm install && npm run build:weapp` 即可构建,不需要主仓库在旁边。
> 只有在**后端接口改了、要重新生成共享契约**时才需要主仓库,见[与主仓库的关系](#与主仓库的关系)。

---

## 目录

- [能力覆盖](#能力覆盖)
- [与 Web 版的差异](#与-web-版的差异)
- [与主仓库的关系](#与主仓库的关系)
- [技术栈与结构](#技术栈与结构)
- [快速开始](#快速开始)
- [后端与域名配置](#后端与域名配置)
- [页面与分包](#页面与分包)
- [接口对照](#接口对照)
- [已知限制](#已知限制)

---

## 能力覆盖

| 模块 | 小程序 | 说明 |
|---|---|---|
| 登录 / 鉴权 | ✅ | 令牌存本地,401 自动跳登录;支持在小程序内配置服务器地址 |
| 仪表盘 | ✅ | 货币资金、周期收支利润、往来款、待办概览、趋势与支出构成(纯 CSS 图表) |
| 记账凭证 | ✅ | 列表(分页/日期区间/关键字)、多分录编辑、借贷平衡校验、红字冲销、附件、凭证关联 |
| 往来单位 | ✅ | 分类维护、搜索、详情与往来业务历史 |
| 会计科目 | ✅ | 一级/二级增改停用、二级科目 Excel 导入、整表导出 |
| 财务报表 | ✅ | 资产负债表 / 利润表 / 现金流量表 / 科目汇总表,月季年切换,导出 Excel |
| 会计账簿 | ✅ | 六类账簿按期间查询,导出单类或全套 Excel |
| 流程设计 | ✅ | 流程与审批步骤可视化编辑、审批人可用性检查 |
| 审批中心 | ✅ | 我的待办、全部审批单、单据内容与流程链、通过/驳回/改派/撤销/删除 |
| 费用申请 | ✅ | 事前申请单 + 预计明细 + 附件、提交审批、审批轨迹 |
| 费用报销 | ✅ | 报销单 + 明细 + 附件、关联费用申请、提交审批、一键生成凭证、补生成审批单 |
| 人员管理 | ✅ | 组织架构(层级压平展示)、员工档案、一人多岗、向部门添加成员 |
| 用户与权限 | ✅ | 用户、角色×权限矩阵、授权预设与批量应用 |
| 操作日志 | ✅ | 按类型/期间查询、展开差异详情、导出 PDF |
| 企业信息 | ✅ | 工商登记 / 财务设置 / 人员 |
| 数据备份 | ⚠️ | 导出走「转发文件到聊天」保存;导入支持从聊天记录选 zip。完整备份仍建议在网页端做 |

权限控制与 Web 版一致:菜单与操作按 `<module>:<action>` 过滤,超管放行一切。

## 与 Web 版的差异

小程序没有浏览器能力,以下部分按平台重新设计,业务口径不变:

| Web 版 | 小程序版 |
|---|---|
| antd `Table` 多列表格 | 业务列表改为卡片流;报表/账簿保留表格,放进横向滚动容器,行列关系与官方版式一致 |
| 资产负债表左右双栏(8 列) | 拆成「资产」「负债和所有者权益」上下两张表,行次不变 |
| recharts 柱状图 | 纯 CSS 比例条(`MiniBars`),不引入 canvas 依赖 |
| `window.open` 下载 Excel/PDF | `Taro.downloadFile` + `Taro.openDocument`,在小程序内打开后可转发保存 |
| `<input type=file>` 上传 | `chooseImage` / `chooseMessageFile` + `Taro.uploadFile` |
| `<img>` / `<iframe>` 预览附件 | 图片走 `previewImage`,PDF/Office 走 `downloadFile` + `openDocument` |
| antd `Select` 搜索下拉 | 自建 `SelectField`:底部弹层 + 搜索,选项多时自动出搜索框 |
| antd `Modal` / `Drawer` | 自建 `Sheet` 底部弹层 |
| `Popconfirm` | `Taro.showModal` 二次确认 |
| 相对路径 `/api` | 必须配置后端**绝对地址**,见下 |

UI 未使用第三方组件库,`src/components/ui` 是一套自建的轻量组件 + `src/styles/tokens.scss` 设计令牌,
依赖只有 `@tarojs/*` 与 `react`,避免版本耦合。

## 与主仓库的关系

两个仓库、一个后端:

| | 仓库 | 内容 |
|---|---|---|
| 主仓库 | [lsgoodlionel/CW](https://github.com/lsgoodlionel/CW) | FastAPI 后端 + Web 前端 + **共享契约的事实源** |
| 本仓库 | lsgoodlionel/CW-WX | 微信小程序端 |

共享的只有 `src/shared/` 这一层 —— 数据类型、枚举文案、权限判定、金额归一化。
其中 `models.generated.ts` **由主仓库从后端 OpenAPI 自动生成**(137 个类型),
`src/types/models.ts`、`src/constants/labels.ts` 只是转出,页面照常引入即可。

**这些文件随本仓库提交**,所以单独 clone 也能直接构建。
只有后端接口改了、要更新契约时,才需要主仓库:

```bash
# 1. 在主仓库 CW 里从后端重新生成
cd ../CW && npm run contract:gen

# 2. 回到本仓库拉取(会自动找相邻的 CW;也可用 CW_REPO=/path/to/CW 指定)
npm run contract:sync
npm run contract:check    # 校验是否与主仓库一致
npm run typecheck         # 后端改了字段,这里会精确指出要改的 UI
```

`npm run contract:sync` 按 `$CW_REPO` → 上级目录 → `../CW` → `../../CW` 的顺序找主仓库,
找不到会给出明确提示 —— 纯构建小程序时不需要它。

> 金额注意:后端 `Decimal` 序列化成**字符串**(`"500.00"`),不是数字。
> 渲染前一律走 `@/utils/format` 的 `money()`(内部用共享的 `toAmount()` 归一),
> 直接对字符串调 `toLocaleString` 不会报错但会静默丢掉千分位。

UI 层(组件、样式、路由、请求封装)完全独立,不与 Web 端共用。
契约机制的完整说明见主仓库的 `docs/SHARED-CONTRACT.md`。

## 技术栈与结构

- Taro 4.2.1 / React 18 / TypeScript 5 / Sass
- 编译目标:`weapp`(微信小程序);config 里保留了 h5 配置,但本项目按小程序验证

```text
CW-WX/
├── config/                 # Taro 构建配置(含 @ 别名、后端地址注入)
├── types/global.d.ts
├── project.config.json     # 微信开发者工具项目配置
├── scripts/sync-contract.mjs   # 从主仓库拉取共享契约
└── src/
    ├── app.config.ts       # 页面注册、分包、tabBar
    ├── app.tsx / app.scss
    ├── assets/tab/         # tabBar 图标
    ├── styles/tokens.scss  # 设计令牌
    ├── shared/             # 共享契约(来自主仓库 CW,勿手改)
    ├── constants/labels.ts # 转出共享文案 + 小程序自己的色调表
    ├── types/models.ts     # 转出共享数据模型
    ├── services/           # env / token / request / auth / api / attachments
    ├── hooks/              # useAuth(登录守卫)、useAsync(数据加载)
    ├── components/
    │   ├── ui/             # Card/Button/Tag/Sheet/SelectField/DataTable/Timeline…
    │   └── business/       # AttachmentBar / ExpenseItems / PeriodPicker / MiniBars
    ├── pages/              # 主包:login / home / voucher.list / approval / mine
    ├── pkgBook/            # 分包:凭证编辑、科目、往来单位、报表、账簿
    ├── pkgFlow/            # 分包:流程设计、费用申请、费用报销
    └── pkgSys/             # 分包:人员、用户权限、日志、企业信息、修改密码
```

## 快速开始

```bash
git clone https://github.com/lsgoodlionel/CW-WX.git
cd CW-WX && npm install
```

开发构建(watch):

```bash
npm run dev:weapp
```

生产构建:

```bash
npm run build:weapp
```

然后用**微信开发者工具**导入本目录,工具会读取 `project.config.json`,
以 `dist/` 作为小程序根目录。首次调试可在工具里勾选「不校验合法域名」。

类型检查:

```bash
npm run typecheck
```

## 后端与域名配置

小程序不能用相对路径,必须指向后端的绝对地址(生产环境需 HTTPS)。三种方式:

1. **构建期默认值**(推荐):

   ```bash
   TARO_APP_API_BASE=https://finance.example.com npm run build:weapp
   ```

2. **运行时修改**:小程序内「我的 → 服务器设置」,或登录页展开「服务器设置」,填写后保存在本地存储。

3. 不配置时,`config/index.ts` 里的占位地址 `https://your-domain.com` 会生效——上线前务必替换。

地址只填到域名,**不要带 `/api`**,请求时会自动拼上。

### 微信后台白名单

在微信公众平台 →「开发管理 → 开发设置 → 服务器域名」把后端域名加入:

- `request` 合法域名(所有接口)
- `uploadFile` 合法域名(附件上传、Excel/zip 导入)
- `downloadFile` 合法域名(附件预览、报表/账簿/日志导出、备份导出)

后端已开放 CORS(`backend/app/main.py`),并支持 `?token=` 传令牌(`auth_mw.py`),
`downloadFile` 这类无法带请求头的场景依赖它,无需改后端。

## 页面与分包

主包(4 个 tab + 登录):

| 路径 | 页面 |
|---|---|
| `pages/home/index` | 仪表盘 |
| `pages/voucher/list` | 记账凭证列表 |
| `pages/approval/index` | 审批中心 |
| `pages/mine/index` | 我的(功能菜单、服务器设置、退出) |
| `pages/login/index` | 登录 |

分包:

| 分包 | 页面 |
|---|---|
| `pkgBook` | `voucher/edit`、`account/index`、`customer/index`、`customer/detail`、`report/index`、`ledger/index` |
| `pkgFlow` | `workflow/index`、`expense/index`、`expense/edit`、`apply/index`、`apply/edit` |
| `pkgSys` | `personnel/index`、`user/index`、`log/index`、`company/index`、`password/index` |

低频、体积大的模块放在分包,主包只保留高频入口,便于控制主包 2MB 限制。

## 接口对照

所有请求集中在 `src/services/api.ts`,按后端 router 分组:

| 分组 | 前缀 |
|---|---|
| `accountsApi` | `/api/accounts` |
| `vouchersApi` | `/api/vouchers` |
| `attachmentsApi` | `/api/attachments` |
| `customersApi` | `/api/customers` |
| `personnelApi` | `/api/personnel` |
| `workflowApi` | `/api/workflow` |
| `expenseApi` | `/api/expense` |
| `expenseApplyApi` | `/api/expense-apply` |
| `reportsApi` | `/api/reports` |
| `ledgersApi` | `/api/ledgers` |
| `logsApi` | `/api/logs` |
| `companyApi` | `/api/company` |
| `usersApi` | `/api/users`、`/api/roles` |
| `presetsApi` | `/api/auth-presets` |

`src/services/request.ts` 统一处理:令牌注入、错误 toast、401 跳登录、上传、下载并打开。

## 已知限制

- **附件预览**:图片与 PDF / Office 文档可在小程序内打开;其它类型(如 zip)只能提示到网页端查看,这是小程序 `openDocument` 的能力边界。
- **数据备份导出**:小程序不能直接落盘,导出后通过「转发到聊天」保存(需微信版本支持 `shareFileMessage`)。完整备份/迁移建议仍在网页端做。
- **报表横向滚动**:资产负债表等宽表在手机上需要左右滑动,这是为保持官方行列口径的取舍。
- **金额输入**:借贷金额允许负数(红字冲销),因此使用普通键盘而非数字键盘。
- **组织架构**:Web 版是可展开的树,小程序按层级缩进平铺展示。
