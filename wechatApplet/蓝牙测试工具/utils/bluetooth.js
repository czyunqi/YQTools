/*********************************************************************
'## bluetooth.js
'## -------------------------------------------------------------------
'## Feature     :   微信小程序蓝牙API封装
'## Version     :   1.0
'## Author      :   云奇(114066164@qq.com)
'## Update Date :   2021-06-30 13:58:28
'## Description :   
'##
'*********************************************************************/

/*********************************************************************
'## 通用函数
'*********************************************************************/
/**
 * 合并json对象
 * @param {obj} data 默认参数
 * @param {obj} dataExtend 自定义新参数
 */
function extend(data, dataExtend) {
  var res = {};
  for (var key in data) {
    res[key] = data[key];
  }
  for (var key in dataExtend) {
    res[key] = dataExtend[key];
  }
  return res;
}

/**
 * 打印结果
 * @param {obj} options 参数
 */
function printResult(options) {
  var _options = {
      onShow: true, //是否显示弹窗提醒
      code: 0, //状态码
      msg: "正常!", //状态描述
      data: "" //额外数据
    },
    options = extend(_options, options);
  return options;
}

/**
 * 格式化返回null、undefined、空值
 * @param {string} str 字符串
 */
function formatNull(str) {
  if (str == null || str == '' || typeof (str) == 'undefined') {
    return "";
  } else {
    return str;
  }
}

/**
 * 格式化日期时间
 * @param {date} d 日期时间
 * @param {string} format 格式
 * formatDate(date,'yyyy-MM-dd hh:mm:ss')
 */
function formatDate(d, format) {
  var date = {
    "M+": d.getMonth() + 1,
    "d+": d.getDate(),
    "h+": d.getHours(),
    "m+": d.getMinutes(),
    "s+": d.getSeconds(),
    "q+": Math.floor((d.getMonth() + 3) / 3),
    "S+": d.getMilliseconds()
  };
  if (/(y+)/i.test(format)) {
    format = format.replace(RegExp.$1, (d.getFullYear() + '').substr(4 - RegExp.$1.length));
  }
  for (var k in date) {
    if (new RegExp("(" + k + ")").test(format)) {
      format = format.replace(RegExp.$1, RegExp.$1.length == 1 ?
        date[k] : ("00" + date[k]).substr(("" + date[k]).length));
    }
  }
  return format;
}

//获取当前时间
function getNowTime() {
  return formatDate(new Date(), 'yyyy-MM-dd hh:mm:ss');
}

// 16进制转10进制
function hex2dex(str) {
  return parseInt(str, 16).toString(10)
}

// 十六进制转ASCII码
function hexCharCodeToStr(hexCharCodeStr) {
  var trimedStr = hexCharCodeStr.trim();
  var rawStr = trimedStr.substr(0, 2).toLowerCase() === "0x" ? trimedStr.substr(2) : trimedStr;
  var len = rawStr.length;
  /*if (len % 2 !== 0) {
    wx.showModal({
      title: '提示',
      content: '存在非法字符!',
      showCancel: false
    })
    return "";
  }*/
  var curCharCode;
  var resultStr = [];
  for (var i = 0; i < len; i = i + 2) {
    curCharCode = parseInt(rawStr.substr(i, 2), 16);
    resultStr.push(String.fromCharCode(curCharCode));
  }
  return resultStr.join("");
}

// ArrayBuffer转16进度字符串
function ab2hex(buffer) {
  const hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('')
}

// 字符串转为ArrayBuffer对象
function str2ab(str) {
  /*var buf = new ArrayBuffer(str.length / 2);
  var bufView = new Uint8Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = parseInt(str.slice(i * 2, i * 2 + 2), 16);
  }*/

  var buf = new ArrayBuffer(str.length);
  var bufView = new DataView(buf);
  for (var i = 0, len = str.length; i < len; i++) {
    bufView.setUint8(i, str.charAt(i).charCodeAt());
  }

  return buf;
}

/*********************************************************************
'## 蓝牙交互API封装类
'*********************************************************************/
class bluetooth {

  constructor() {
    this.options = {
      // 初始化蓝牙模块配置
      initDevice: {
        mode: "central", //蓝牙模式，可作为主/从设备，仅 iOS 需要。 //central=主机模式,peripheral=从机模式
        success: null, //成功回调
        fail: null //失败回调
      },
      // 获取本机蓝牙适配器状态。
      getAdapterState: {
        isDvailable: false, //蓝牙适配器是否可用
        success: null, //成功回调
        fail: null //失败回调
      },
      // 监听蓝牙适配器状态变化事件
      onChanage: {
        success: null //监听成功回调
      },
      // 搜索蓝牙
      search: {
        onAutoStopSearch: true, //是否自动关闭搜索
        searchMaxTime: 1, //搜索最大时长，单位分钟，自动关闭搜索时有效
        isFinded: false, //是否停止搜索蓝牙
        deviceName: "", //蓝牙设备名【依据蓝牙设备名搜索指定蓝牙，无则不要传递】
        services: "", //要搜索的蓝牙设备主 service 的 uuid 列表。某些蓝牙设备会广播自己的主 service 的 uuid。如果设置此参数，则只搜索广播包有对应 uuid 的主服务的蓝牙设备。建议主要通过该参数过滤掉周边不需要处理的其他蓝牙设备。【如果为空请不要传递，IOS会出现闪退】
        allowDuplicatesKey: true, //是否允许重复上报同一设备。如果允许重复上报，则 wx.onBlueToothDeviceFound 方法会多次上报同一设备，但是 RSSI 值会有不同。
        interval: 0, //上报设备的间隔。0 表示找到新设备立即上报，其他数值根据传入的间隔上报。
        powerLevel: "medium", //扫描模式，越高扫描越快，也越耗电, 仅安卓 7.0.12 及以上支持。
        success: null, //成功回调
        fail: null, //失败回调
        stopCallBack: null, //停止搜索回调
        blueList: [], //搜索到得蓝牙设备结果列表
      },
      // 连接蓝牙
      connection: {
        isConnected: false, //是否已连接
        deviceId: "", //蓝牙设备 id
        serviceId: "", //蓝牙有效主服务UUID
        writeId: "", //是否支持 write 操作的UUID
        notifyId: "", //是否支持 notify 操作的UUID
        timeout: "", //超时时间，单位ms，不填表示不会超时
        success: null, //成功回调
        fail: null, //失败回调
        changeSuccess: null, //获取订阅消息成功回调
        changeFail: null //获取订阅消息失败回调
      },
      // 断开蓝牙
      close: {
        deviceId: "", //蓝牙设备 id
        success: null, //成功回调
        fail: null, //失败回调
      },
      // 发送指令
      write: {
        deviceId: "", //蓝牙设备 id
        serviceId: "", //蓝牙特征值对应服务的 uuid
        writeId: "", //蓝牙特征值的 uuid
        value: "", //蓝牙设备特征值对应的二进制值
        success: null, //成功回调
        fail: null, //失败回调
      }
    };
    this.timer = null; //定时器
  }

  /**
   * 初始化
   * @param {obj} options 选项
   */
  init(options) {
    this.options = extend(this.options, options)
    this.initDevice();
  }

  // 初始化蓝牙模块
  initDevice() {
    var that = this;
    wx.openBluetoothAdapter({
      mode: that.options.initDevice.mode,
      success: function (res) {
        setTimeout(() => {
          that.getAdapterState();
          if (that.options.initDevice.success) that.options.initDevice.success(printResult({
            onShow: false,
            code: 0,
            msg: "初始化蓝牙模块成功!"
          }));
        }, 1000)
      },
      fail: function (res) {
        wx.showModal({
          content: "初始化蓝牙失败!请确认是否开启蓝牙功能!",
          showCancel: false,
          success: function () {
            if (that.options.initDevice.fail) that.options.initDevice.fail(printResult({
              onShow: false,
              code: 9999,
              msg: res.errMsg
            }));
          }
        });
      }
    });
  }

  // 获取本机蓝牙适配器状态。
  getAdapterState() {
    var that = this;
    wx.getBluetoothAdapterState({
      success: function (res) {
        var isDiscov = res.discovering; //是否正在搜索设备
        var isDvailable = res.available; //蓝牙适配器是否可用
        if (isDvailable) {
          that.getAdapterState.isDvailable = true;
          if (that.options.getAdapterState.success) that.options.getAdapterState.success(printResult({
            onShow: false,
            code: 0,
            msg: "蓝牙适配器可用!"
          }));
        } else {
          wx.showModal({
            content: "请开启蓝牙!",
            showCancel: false,
            success: function () {
              if (that.options.getAdapterState.fail) that.options.getAdapterState.fail(printResult({
                onShow: false,
                code: 9999,
                msg: res.errMsg
              }));
            }
          });
        }
      },
      fail: function (res) {
        wx.showModal({
          content: "请开启蓝牙!",
          showCancel: false,
          success: function () {
            if (that.options.getAdapterState.fail) that.options.getAdapterState.fail(printResult({
              onShow: false,
              code: 9999,
              msg: res.errMsg
            }));
          }
        });
      }
    });
  }

  // 监听蓝牙适配器状态变化事件
  onAdapterStateChange(options) {
    var that = this;
    that.options.onChanage = extend(that.options.onChanage, options)
    wx.onBluetoothAdapterStateChange(function (res) {
      var isDvailable = res.available; //蓝牙适配器是否可用
      that.getAdapterState();
      if (that.options.onChanage.success) that.options.onChanage.success(printResult({
        onShow: false,
        code: 0,
        msg: "监听蓝牙适配器成功!"
      }));
    });
  }

  // 搜索蓝牙
  search(options) {
    var that = this;
    that.options.search = extend(that.options.search, options)

    if (that.getAdapterState.isDvailable) {
      //开始搜寻附近的蓝牙外围设备。此操作比较耗费系统资源，请在搜索并连接到设备后调用 wx.stopBluetoothDevicesDiscovery 方法停止搜索。
      var data = {
        allowDuplicatesKey: that.options.search.allowDuplicatesKey,
        success: function (res) {
          //监听寻找到新设备的事件
          wx.onBluetoothDeviceFound(function (r) {
            var devices = r.devices; //新搜索到的设备列表
            devices.forEach(function (d) {

              var arr = that.options.search.blueList,
                printResultData = {
                  onShow: false,
                  code: 0,
                  msg: "搜索成功!",
                  data: {
                    device: ""
                  }
                };

              if (formatNull(d.name) == "" && formatNull(d.localName) == "") {
                return
              }
              //搜索指定蓝牙设备，搜索成功则返回该蓝牙设备信息deviceId等
              //校验是搜索指定蓝牙设备or搜索附近蓝牙设备：deviceName不为空则搜索指定蓝牙设备
              if (that.options.search.deviceName != "") {
                if (d.localName == that.options.search.deviceName) {
                  printResultData.data.device = d;
                  that.stopSearch();
                }
              } else {
                //校验是否已经存在搜索结果中
                var hasList = arr.find((v) => {
                  return v.deviceId == d.deviceId;
                });
                if (typeof (hasList) == 'undefined') {
                  that.options.search.blueList.push(d);
                  printResultData.data.device = d;
                }
              }

              //返回搜索结果
              if (that.options.search.success) that.options.search.success(printResult(printResultData));

            });
          });
        },
        fail: function (res) {
          wx.showModal({
            content: "搜索蓝牙失败!",
            showCancel: false,
            success: function () {
              if (that.options.search.fail) that.options.search.fail(printResult({
                onShow: false,
                code: 9999,
                msg: res.errMsg
              }));
            }
          });
        }
      };
      if (formatNull(that.options.search.services) != "") {
        data.services = that.options.search.services;
      }
      wx.startBluetoothDevicesDiscovery(data);
      //开启自动关闭搜索
      if (that.options.search.onAutoStopSearch) {
        if (that.timer) clearInterval(that.timer)
        that.timer = setInterval(function () {
          that.stopSearch();
        }, that.options.search.searchMaxTime * 60 * 1000);
      }
    } else {
      wx.showModal({
        content: "蓝牙适配器不可用!",
        showCancel: false,
        success: function () {
          if (that.options.search.fail) that.options.search.fail(printResult({
            onShow: false,
            code: 9999,
            msg: "蓝牙适配器不可用!"
          }));
        }
      });
    }
  }

  // 停止搜索蓝牙
  stopSearch() {
    var that = this;
    var arr = that.options.search.blueList;
    if (that.getAdapterState.isDvailable && !that.search.isFinded) {
      if (that.timer) clearInterval(that.timer)
      that.search.isFinded = true;
      wx.offBluetoothDeviceFound();
      wx.stopBluetoothDevicesDiscovery();
      if (that.options.search.stopCallBack) that.options.search.stopCallBack(printResult({
        onShow: false,
        code: 0,
        msg: "搜索蓝牙已结束!",
        data: {
          blueList: arr
        }
      }));
    }
  }

  // 连接蓝牙设备
  createBLEConnection(options) {
    var that = this;
    that.options.connection = extend(that.options.connection, options)

    if (formatNull(that.options.connection.deviceId) == "") {
      wx.showModal({
        content: "deviceId找不到!",
        showCancel: false,
        success: function () {
          if (that.options.connection.fail) that.options.connection.fail(printResult({
            onShow: false,
            code: 9999,
            msg: "deviceId找不到!"
          }));
        }
      });
    }

    //初始化要连接的蓝牙设备信息【因为只支持单设备连接】
    that.options.connection.isConnected = false;
    that.options.connection.serviceId = "";
    that.options.connection.writeId = "";
    that.options.connection.notifyId = "";

    //连接低功耗蓝牙设备。
    wx.createBLEConnection({
      deviceId: that.options.connection.deviceId,
      timeout: that.options.connection.timeout,
      success: function (res) {
        that.options.connection.isConnected = true;
        that.getUUID();
      },
      fail: function (res) {
        wx.showModal({
          content: "连接蓝牙失败!",
          showCancel: false,
          success: function () {
            if (that.options.connection.fail) that.options.connection.fail(printResult({
              onShow: false,
              code: 9999,
              msg: res.errMsg
            }));
          }
        });
      }
    });
  }

  // 获取蓝牙设备UUID
  getUUID() {
    var that = this;
    if (that.options.connection.isConnected) {
      //获取蓝牙设备所有服务
      wx.getBLEDeviceServices({
        deviceId: that.options.connection.deviceId,
        success: function (res) {
          var services = res.services;
          if (services.length <= 0) {
            wx.showModal({
              content: "获取服务失败，请重试!",
              showCancel: false,
              success: function () {
                if (that.options.connection.fail) that.options.connection.fail(printResult({
                  onShow: false,
                  code: 9999,
                  msg: "获取服务失败，请重试!"
                }));
              }
            });
            return;
          }
          //循环获取serviceId
          var hasServiceId = false; //校验是否找到有效UUID
          for (var x in services) {
            //找到有效UUID
            //某蓝牙设备获取多个主id数据如下2条：180A 一般是设备通用提供的一个service，不具备与业务逻辑相关的服务。所以要过滤掉
            //0000180A-0000-1000-8000-00805F9B34FB
            //0000FFF0-0000-1000-8000-00805F9B34FB
            if (services[x].isPrimary && services[x].uuid.split("-")[0] != "0000180A") {
              that.options.connection.serviceId = services[x].uuid;
              hasServiceId = true;
              break;
            }
          }

          if (!hasServiceId) {
            wx.showModal({
              content: "未找到蓝牙设备有效UUID!",
              showCancel: false,
              success: function () {
                if (that.options.connection.fail) that.options.connection.fail(printResult({
                  onShow: false,
                  code: 9999,
                  msg: "未找到蓝牙设备有效UUID!"
                }));
              }
            });
          }

          that.getCharacteristics();

        },
        fail: function (res) {
          wx.showModal({
            content: "获取蓝牙信息失败!",
            showCancel: false,
            success: function () {
              if (that.options.connection.fail) that.options.connection.fail(printResult({
                onShow: false,
                code: 9999,
                msg: res.errMsg
              }));
            }
          });
        }
      });
    } else {
      wx.showModal({
        content: "请先连接蓝牙!",
        showCancel: false,
        success: function () {
          if (that.options.connection.fail) that.options.connection.fail(printResult({
            onShow: false,
            code: 9999,
            msg: "请先连接蓝牙!"
          }));
        }
      });
    }
  }

  // 获取蓝牙设备所有特征值
  getCharacteristics() {
    var that = this;
    wx.getBLEDeviceCharacteristics({
      deviceId: that.options.connection.deviceId,
      serviceId: that.options.connection.serviceId,
      success: function (res) {
        var charactArray = res.characteristics;
        if (charactArray.length <= 0) {
          wx.showModal({
            content: '获取特征值失败，请重试!',
            showCancel: false,
            success: function () {
              if (that.options.connection.fail) that.options.connection.fail(printResult({
                onShow: false,
                code: 9999,
                msg: '获取特征值失败，请重试!'
              }));
            }
          });
          return;
        }
        //charactArray  也就是  res.characteristics 这个里面有能读数据的 能写数据的 要分着用
        for (var x in charactArray) {
          //写数据   
          if (charactArray[x].properties.write && that.options.connection.writeId == "") {
            that.options.connection.writeId = charactArray[x].uuid
          }
          //读数据
          if (charactArray[x].properties.notify && that.options.connection.notifyId == "") {
            that.options.connection.notifyId = charactArray[x].uuid
          }
        }

        //监听订阅消息
        wx.notifyBLECharacteristicValueChange({
          state: true,
          deviceId: that.options.connection.deviceId,
          serviceId: that.options.connection.serviceId,
          characteristicId: that.options.connection.notifyId,
          success() {
            wx.onBLECharacteristicValueChange(function (onNotityChangeRes) {
              var characteristicValue = ab2hex(onNotityChangeRes.value);
              characteristicValue = hexCharCodeToStr(characteristicValue);
              //获取监听数据
              if (that.options.connection.changeSuccess) that.options.connection.changeSuccess(printResult({
                onShow: false,
                code: 0,
                msg: "获取设备订阅消息成功!",
                data: {
                  time: getNowTime(), //发送or接收时间
                  type: 1, //类型：0=发送；1=接收
                  value: characteristicValue, //接收内容
                  status: true //接收状态
                }
              }))
            })
          },
          fail: (res) => {
            console.warn("监听特征值失败", res);
            if (that.options.connection.changeFail) that.options.connection.changeFail(printResult({
              onShow: false,
              code: 0,
              msg: "监听特征值失败!",
            }))
          }
        })

        if (that.options.connection.success) that.options.connection.success(printResult({
          onShow: false,
          code: 0,
          msg: "连接蓝牙成功!",
          data: {
            isConnected: that.options.connection.isConnected,
            deviceId: that.options.connection.deviceId,
            serviceId: that.options.connection.serviceId,
            writeId: that.options.connection.writeId,
            notifyId: that.options.connection.notifyId
          }
        }));
      },
      fail: function (res) {
        wx.showModal({
          content: "获取蓝牙特征值失败!",
          showCancel: false,
          success: function () {
            if (that.options.connection.fail) that.options.connection.fail(printResult({
              onShow: false,
              code: 9999,
              msg: res.errMsg
            }));
          }
        });
      }
    });
  }

  // 断开蓝牙连接
  closeBLEConnection(options) {
    var that = this;
    that.options.close = extend(that.options.close, options)

    if (formatNull(that.options.close.deviceId) == "") {
      wx.showModal({
        content: "deviceId找不到!",
        showCancel: false,
        success: function () {
          if (that.options.close.fail) that.options.close.fail(printResult({
            onShow: false,
            code: 9999,
            msg: "deviceId找不到!"
          }));
        }
      });
    }

    //断开连接
    wx.closeBLEConnection({
      deviceId: that.options.close.deviceId,
      success: function (res) {
        if (that.options.close.success) that.options.close.success(printResult({
          onShow: false,
          code: 0,
          msg: "断开蓝牙成功!"
        }));
      },
      fail: function (res) {
        wx.showModal({
          content: "断开蓝牙失败!",
          showCancel: false,
          success: function () {
            that.options.connection.isConnected = false;
            if (that.options.close.fail) that.options.close.fail(printResult({
              onShow: false,
              code: 9999,
              msg: res.errMsg,
              data: {
                isConnected: that.options.connection.isConnected
              }
            }));
          }
        });
      }
    });
  }

  // 发送指令
  writeBLECharacteristicValue(options) {
    var that = this;
    that.options.write = extend(that.options.write, options)

    if (formatNull(that.options.write.deviceId) == "") {
      wx.showModal({
        content: "deviceId找不到!",
        showCancel: false,
        success: function () {
          if (that.options.write.fail) that.options.write.fail(printResult({
            onShow: false,
            code: 9999,
            msg: "deviceId找不到!"
          }));
        }
      });
    }

    wx.writeBLECharacteristicValue({
      deviceId: that.options.write.deviceId,
      serviceId: that.options.write.serviceId,
      characteristicId: that.options.write.writeId,
      value: str2ab(that.options.write.value),
      success: function (res) {
        if (that.options.write.success) that.options.write.success(printResult({
          onShow: false,
          code: 0,
          msg: "发送成功!",
          data: {
            time: getNowTime(), //发送or接收时间
            type: 0, //类型：0=发送；1=接收
            value: that.options.write.value, //发送内容
            status: true //发送状态
          }
        }));
      },
      fail: function (res) {
        wx.showModal({
          content: "发送指令失败!",
          showCancel: false,
          success: function () {
            if (that.options.write.fail) that.options.write.fail(printResult({
              onShow: false,
              code: 9999,
              msg: res.errMsg
            }));
          }
        });
      }

    });
  }

  // 销毁蓝牙
  destroyBlueTooth() {
    var that = this;
    that.stopSearch();
    wx.closeBluetoothAdapter({
      success(res) {}
    })
  }

}

module.exports = {
  device: new bluetooth()
}