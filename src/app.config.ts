export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/voucher/list',
    'pages/approval/index',
    'pages/mine/index',
    'pages/login/index',
  ],
  subPackages: [
    {
      root: 'pkgBook',
      pages: [
        'voucher/edit',
        'account/index',
        'customer/index',
        'customer/detail',
        'report/index',
        'ledger/index',
      ],
    },
    {
      root: 'pkgFlow',
      pages: [
        'workflow/index',
        'expense/index',
        'expense/edit',
        'apply/index',
        'apply/edit',
      ],
    },
    {
      root: 'pkgSys',
      pages: [
        'personnel/index',
        'user/index',
        'log/index',
        'company/index',
        'password/index',
      ],
    },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1f6feb',
    navigationBarTitleText: '财务记账',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f2f4f7',
  },
  tabBar: {
    color: '#8a94a6',
    selectedColor: '#1f6feb',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/home/index', text: '仪表盘', iconPath: 'assets/tab/home.png', selectedIconPath: 'assets/tab/home-on.png' },
      { pagePath: 'pages/voucher/list', text: '凭证', iconPath: 'assets/tab/book.png', selectedIconPath: 'assets/tab/book-on.png' },
      { pagePath: 'pages/approval/index', text: '审批', iconPath: 'assets/tab/check.png', selectedIconPath: 'assets/tab/check-on.png' },
      { pagePath: 'pages/mine/index', text: '我的', iconPath: 'assets/tab/user.png', selectedIconPath: 'assets/tab/user-on.png' },
    ],
  },
  permission: {},
  lazyCodeLoading: 'requiredComponents',
})
