package com.bettingapp.nyxprinter

object PrinterResult {
    const val SDK_OK: Int = 0
    const val SDK_BASE_ERR: Int = -1000
    const val SDK_SENT_ERR: Int = -1001 // 发送失败
    const val SDK_PARAM_ERR: Int = -1002 // 参数错误
    const val SDK_TIMEOUT: Int = -1003 // 超时
    const val SDK_RECV_ERR: Int = -1004 // 接受错误
    const val SDK_UNKNOWN_ERR: Int = -1005 // 其他异常
    const val SDK_CMD_ERR: Int = -1006 // 收发指令不一致
    const val SDK_UNKNOWN_CMD: Int = -1015 // 未知命令
    const val SDK_FEATURE_NOT_SUPPORT: Int = -1099 // 功能不支持
    const val SDK_SERVICE_NOT_BIND: Int = -1098 // 打印服务未绑定

    // 设备连接
    const val DEVICE_NOT_CONNECT: Int = -1100 // 未连接
    const val DEVICE_DISCONNECT: Int = -1101 // 断开连接
    const val DEVICE_CONNECTED: Int = -1102 // 已连接
    const val DEVICE_CONN_ERR: Int = -1103 // 连接失败
    const val DEVICE_NOT_SUPPORT: Int = -1104
    const val DEVICE_NOT_FOUND: Int = -1105
    const val DEVICE_OPEN_ERR: Int = -1106
    const val DEVICE_NO_PERMISSION: Int = -1107

    // 打印机
    const val PRN_BASE_ERR: Int = -1200
    const val PRN_COVER_OPEN: Int = (PRN_BASE_ERR - 1) // 打印机仓盖未关闭
    const val PRN_PARAM_ERR: Int = (PRN_BASE_ERR - 2) // 参数错误
    const val PRN_NO_PAPER: Int = (PRN_BASE_ERR - 3) // 打印机缺纸
    const val PRN_OVERHEAT: Int = (PRN_BASE_ERR - 4) // 打印机过热
    const val PRN_UNKNOWN_ERR: Int = (PRN_BASE_ERR - 5) // 打印机未知异常
    const val PRN_PRINTING: Int = (PRN_BASE_ERR - 6) // 打印机正在打印
    const val PRN_NO_NFC: Int = (PRN_BASE_ERR - 7) // 打印机无NFC标签
    const val PRN_NFC_NO_PAPER: Int = (PRN_BASE_ERR - 8) // 打印机NFC标签没有剩余次数
    const val PRN_LOW_BATTERY: Int = (PRN_BASE_ERR - 9) // 打印机低电量
    const val PRN_LBL_LOCATE_ERR: Int = (PRN_BASE_ERR - 90) // 打印机标签定位错误
    const val PRN_LBL_DETECT_ERR: Int = (PRN_BASE_ERR - 91) // 打印机标签纸检测错误
    const val PRN_LBL_NO_DETECT: Int = (PRN_BASE_ERR - 92) // 打印机未检测标签纸

    fun msg(code: Int?): String {
        return when (code) {
            SDK_OK -> "Success"
            SDK_SERVICE_NOT_BIND -> "Printer service not bind"
            SDK_SENT_ERR -> "Send error"
            SDK_PARAM_ERR -> "Params error"
            SDK_TIMEOUT -> "Timeout"
            SDK_RECV_ERR -> "Receive error"
            SDK_CMD_ERR -> "Cmd error"
            SDK_UNKNOWN_CMD -> "Unknown cmd"
            SDK_FEATURE_NOT_SUPPORT -> "Feature not support"
            DEVICE_NOT_CONNECT -> "Device not connected"
            DEVICE_DISCONNECT -> "Device disconnected"
            DEVICE_CONNECTED -> "Device connected"
            DEVICE_CONN_ERR -> "Device connect error"
            DEVICE_NOT_SUPPORT -> "Device not support"
            DEVICE_NOT_FOUND -> "Device not found"
            DEVICE_OPEN_ERR -> "Device open error"
            DEVICE_NO_PERMISSION -> "No permission"
            PRN_COVER_OPEN -> "Printer cover open"
            PRN_PARAM_ERR -> "Printer params error"
            PRN_NO_PAPER -> "Printer no paper"
            PRN_OVERHEAT -> "Printer overheat"
            PRN_UNKNOWN_ERR -> "Printer unknown error"
            PRN_PRINTING -> "Printer is printing"
            PRN_NO_NFC -> "Printer no NFC"
            PRN_NFC_NO_PAPER -> "Printer NFC no paper"
            PRN_LOW_BATTERY -> "Printer low battery"
            PRN_LBL_LOCATE_ERR -> "Printer label locate error"
            PRN_LBL_DETECT_ERR -> "Printer label detect error"
            PRN_LBL_NO_DETECT -> "Printer label not detected"
            else -> "unknown error"
        }
    }
}

