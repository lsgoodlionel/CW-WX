import { PropsWithChildren } from 'react'
import './app.scss'

/**
 * 应用根组件。
 * 登录态由各页面通过 useAuth 自行守卫(小程序无路由中间件),
 * 未登录时统一 redirect 到 pages/login/index。
 */
function App({ children }: PropsWithChildren) {
  return <>{children}</>
}

export default App
