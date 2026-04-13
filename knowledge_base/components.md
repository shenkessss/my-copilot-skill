# 公司内部组件库

## HXButton
公司封装的基础按钮组件，支持 primary / secondary / danger 三种样式。
用法：`HXButton(title: "确认", style: .primary) { }`

## HXNetworkManager
公司封装的网络请求工具。
用法：`HXNetworkManager.request(.get, url: "xxx", params: [:]) { result in }`

## HXToast
轻量级 Toast 提示。
用法：`HXToast.show("操作成功")`
