const app = getApp(),
  bluetooth = require('../../utils/bluetooth');

Page({
  data: {
    isDvailable: false, //蓝牙适配器是否可用
    isSearchIng: false, //搜索状态：true=搜索中；false=已停止搜索
    tipsText: "", //提示文字
    //蓝牙设备列表
    //[{name:"测试假蓝牙数据",deviceId:"0000-0000-0000-00000",RSSI:"0",isConnected:false,serviceId:"",writeId:"",vaule:"",notifyId:"",info:[]}]
    list: [],
  },

  onLoad() {
    var that = this;
    that.setTipsText("初始化蓝牙模块中...");
    //初始化蓝牙模块
    bluetooth.device.init({
      //初始化蓝牙模块配置
      initDevice: {
        mode: "central",
        success: function (res) {
          that.setTipsText(res.msg);
        },
        fail: function (res) {
          that.setTipsText(res.msg);
        }
      },
      //获取本机蓝牙适配器状态
      getAdapterState: {
        success: function (res) {
          //可用直接进入成功回调
          that.setData({
            isDvailable: true
          });
          that.setTipsText(res.msg);
        },
        fail: function (res) {
          //不可用直接进入失败回调
          that.setData({
            isDvailable: false
          });
          that.setTipsText(res.msg);
        }
      }
    });
  },
  onShow() {
    var that = this;
    bluetooth.device.onAdapterStateChange({
      success: function (res) {
        that.setTipsText(res.msg);
      }
    }); //监听蓝牙适配器改变事件
  },
  onUnload: function () {
    bluetooth.device.destroyBlueTooth(); //销毁蓝牙
  },

  //改变提示文字
  setTipsText: function (text) {
    var that = this;
    that.setData({
      tipsText: text
    });
  },

  //搜索、停止搜索蓝牙设备
  searchBlueTooth(e) {
    var that = this;

    //改变搜索按钮状态
    function chanageSearchBtnStauts() {
      that.setData({
        isSearchIng: !that.data.isSearchIng
      });
      if (that.data.isSearchIng) {
        that.setTipsText("搜索蓝牙设备中...");
      } else {
        that.setTipsText("已停止搜索蓝牙设备!");
      }
    }

    if (that.data.isSearchIng) {
      chanageSearchBtnStauts();
      bluetooth.device.stopSearch();
    } else {
      chanageSearchBtnStauts();
      bluetooth.device.search({
        onAutoStopSearch: true,
        searchMaxTime: 1,
        deviceName: "sq-A", //sq-A
        services: "",
        allowDuplicatesKey: true,
        success: function (res) {
          if (res.data.device != "") {
            //返回了新设备信息
            that.setTipsText("新蓝牙设备：" + res.data.device.name);
            var arr = [],
              device = res.data.device;
            device.isConnected = false; //是否已连接
            device.serviceId = "";
            device.writeId = "";
            device.notifyId = "";
            device.value = ""; //发送指令内容
            device.info = []; //来往指令记录列表
            arr.push(device)
            that.setData({
              list: that.data.list.concat(arr)
            });
          }
        },
        fail: function (res) {
          that.setTipsText(res.msg);
          chanageSearchBtnStauts();
        },
        stopCallBack: function (res) {
          var blueList = res.data.blueList;
          chanageSearchBtnStauts();
          that.setTipsText(res.msg + " 搜索结果：" + blueList.length + " 条");
        }
      });
    }
  },

  //连接
  connect(e) {
    var that = this,
      data = e.currentTarget.dataset,
      index = data.index,
      detail = that.data.list[index];
    that.setTipsText("连接蓝牙设备(" + detail.name + ")中...");
    bluetooth.device.createBLEConnection({
      deviceId: detail.deviceId,
      timeout: "",
      success: function (res) {
        that.setTipsText("连接蓝牙设备(" + detail.name + ")成功!");
        detail.isConnected = res.data.isConnected;
        detail.serviceId = res.data.serviceId;
        detail.writeId = res.data.writeId;
        detail.notifyId = res.data.notifyId;
        that.setData({
          list: that.data.list
        });
      },
      fail: function (res) {
        that.setTipsText("连接蓝牙设备(" + detail.name + ")失败!");
      },
      changeSuccess: function (res) {
        that.setTipsText("获取订阅消息(" + detail.name + ")成功!");
        var info = {
          time: res.data.time,
          type: res.data.type, //类型：0=发送；1=接收
          value: res.data.value, //发送or接收值
          status: res.data.status //发送状态：true=成功
        };
        detail.info.push(info);
        that.setData({
          list: that.data.list
        });
      },
      changeFail: function (res) {
        that.setTipsText("获取订阅消息(" + detail.name + ")失败!");
      }
    });
  },

  //断开
  close(e) {
    var that = this,
      data = e.currentTarget.dataset,
      index = data.index,
      detail = that.data.list[index];
    that.setTipsText("断开蓝牙设备(" + detail.name + ")中...");
    bluetooth.device.closeBLEConnection({
      deviceId: detail.deviceId,
      success: function (res) {
        that.setTipsText("断开蓝牙设备(" + detail.name + ")成功!");
        detail.isConnected = res.data.isConnected;
        that.setData({
          list: that.data.list
        });
      },
      fail: function (res) {
        that.setTipsText("断开蓝牙设备(" + detail.name + ")失败!");
      }
    });
  },

  //监听输入框
  bindInput: function (e) {
    var that = this,
      dataset = e.currentTarget.dataset,
      index = dataset.index,
      detail = that.data.list[index],
      value = e.detail.value,
      name = dataset.name;
    detail[name] = value;
    that.setData({
      list: that.data.list
    })
  },

  //发送指令
  send(e) {
    var that = this,
      data = e.currentTarget.dataset,
      index = data.index,
      detail = that.data.list[index];
    that.setTipsText("发送指令(" + detail.name + ")中...");
    if (detail.value == "") {
      wx.showModal({
        content: "请输入指令!",
        showCancel: false,
        success: function () {}
      });
      return false;
    }

    bluetooth.device.writeBLECharacteristicValue({
      deviceId: detail.deviceId,
      serviceId: detail.serviceId,
      writeId: detail.writeId,
      value: detail.value,
      success: function (res) {
        that.setTipsText("发送指令(" + detail.name + ")成功!");
        var info = {
          time: res.data.time,
          type: res.data.type, //类型：0=发送；1=接收
          value: res.data.value, //发送or接收值
          status: res.data.status //发送状态：true=成功
        };
        detail.info.push(info);
        that.setData({
          list: that.data.list
        });
      },
      fail: function (res) {
        that.setTipsText("发送指令(" + detail.name + ")失败!");
      }
    });
  },

  //清空指令结果
  clearSend(e) {
    var that = this,
      data = e.currentTarget.dataset,
      index = data.index,
      detail = that.data.list[index];
    detail.info = [];
    that.setData({
      list: that.data.list
    });

    that.setTipsText("发送/接收内容已清空!");
  }

})