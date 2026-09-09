// app.js
App({
  globalData: {
    userInfo: null,
    openid: null,
    userProfile: null  // 用户个人资料（从lab6_users获取）
  },

  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-d1g0t1mua0eceb9aa',
        traceUser: true,
      });
    }

    // 尝试从本地缓存获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }

    // 获取openid
    this.getOpenid();
  },

  // 获取用户openid
  getOpenid: function () {
    const that = this;
    wx.cloud.callFunction({
      name: 'getOpenid_lab6',
      data: {},
      success: res => {
        console.log('云函数获取openid成功', res);
        if (res.result && res.result.openid) {
          that.globalData.openid = res.result.openid;
          wx.setStorageSync('openid', res.result.openid);
          // 获取到openid后，自动获取用户资料
          that.getUserProfile();
        }
      },
      fail: err => {
        console.error('云函数获取openid失败', err);
      }
    });
  },

  // 设置用户信息
  setUserInfo: function (userInfo) {
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('userInfo', userInfo);
  },

  // 获取用户个人资料（从lab6_users）
  getUserProfile: function () {
    const that = this;
    if (!this.globalData.openid) {
      return null;
    }

    const db = wx.cloud.database();
    db.collection('lab6_users')
      .where({ openid: this.globalData.openid })
      .get({
        success: function (res) {
          if (res.data && res.data.length > 0) {
            const profile = res.data[0];
            that.globalData.userProfile = profile;
            // 同步更新userInfo中的头像昵称
            if (profile.avatarUrl || profile.nickName) {
              const userInfo = that.globalData.userInfo || {};
              if (profile.avatarUrl) userInfo.avatarUrl = profile.avatarUrl;
              if (profile.nickName) userInfo.nickName = profile.nickName;
              that.globalData.userInfo = userInfo;
              wx.setStorageSync('userInfo', userInfo);
            }
            console.log('获取用户资料成功', profile);
          } else {
            console.log('用户尚未设置资料');
          }
        },
        fail: function (err) {
          console.error('获取用户资料失败', err);
        }
      });
  },

  // 保存用户个人资料（到lab6_users）
  saveUserProfile: function (profileData, callback) {
    const that = this;
    if (!this.globalData.openid) {
      if (callback) callback({ success: false, error: 'openid未获取' });
      return;
    }

    const db = wx.cloud.database();
    const openid = this.globalData.openid;

    // 先查询是否已有记录
    db.collection('lab6_users')
      .where({ openid: openid })
      .get({
        success: function (res) {
          const now = db.serverDate();
          if (res.data && res.data.length > 0) {
            // 已有记录，更新
            const recordId = res.data[0]._id;
            db.collection('lab6_users').doc(recordId).update({
              data: {
                avatarUrl: profileData.avatarUrl,
                nickName: profileData.nickName,
                updateTime: now
              },
              success: function () {
                // 更新全局数据
                const updatedProfile = Object.assign({}, that.globalData.userProfile || {}, profileData, { updateTime: now });
                that.globalData.userProfile = updatedProfile;
                // 同步更新userInfo
                const userInfo = that.globalData.userInfo || {};
                if (profileData.avatarUrl) userInfo.avatarUrl = profileData.avatarUrl;
                if (profileData.nickName) userInfo.nickName = profileData.nickName;
                that.globalData.userInfo = userInfo;
                wx.setStorageSync('userInfo', userInfo);
                if (callback) callback({ success: true });
              },
              fail: function (err) {
                console.error('更新用户资料失败', err);
                if (callback) callback({ success: false, error: err });
              }
            });
          } else {
            // 没有记录，新增
            db.collection('lab6_users').add({
              data: {
                openid: openid,
                avatarUrl: profileData.avatarUrl || '',
                nickName: profileData.nickName || '匿名喵友',
                createTime: now,
                updateTime: now
              },
              success: function (addRes) {
                // 更新全局数据
                const newProfile = {
                  _id: addRes._id,
                  openid: openid,
                  avatarUrl: profileData.avatarUrl || '',
                  nickName: profileData.nickName || '匿名喵友',
                  createTime: now,
                  updateTime: now
                };
                that.globalData.userProfile = newProfile;
                // 同步更新userInfo
                const userInfo = that.globalData.userInfo || {};
                if (profileData.avatarUrl) userInfo.avatarUrl = profileData.avatarUrl;
                if (profileData.nickName) userInfo.nickName = profileData.nickName;
                that.globalData.userInfo = userInfo;
                wx.setStorageSync('userInfo', userInfo);
                if (callback) callback({ success: true });
              },
              fail: function (err) {
                console.error('新增用户资料失败', err);
                if (callback) callback({ success: false, error: err });
              }
            });
          }
        },
        fail: function (err) {
          console.error('查询用户资料失败', err);
          if (callback) callback({ success: false, error: err });
        }
      });
  },

  // 获取当前用户的显示信息（优先使用userProfile，降级到userInfo，最后默认值）
  getCurrentUserDisplay: function () {
    const profile = this.globalData.userProfile;
    const userInfo = this.globalData.userInfo;
    return {
      avatarUrl: (profile && profile.avatarUrl) || (userInfo && userInfo.avatarUrl) || '',
      nickName: (profile && profile.nickName) || (userInfo && userInfo.nickName) || '匿名喵友'
    };
  }
});
