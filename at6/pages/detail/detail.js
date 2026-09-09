// pages/detail/detail.js
const app = getApp()

Page({
  data: {
    id: '',
    photo: null,
    loading: true,
    error: '',
    downloading: false,
    // 点赞
    likeCount: 0,
    isLiked: false,
    likeLoading: false,
    // 评论
    comments: [],
    commentInput: '',
    commentLoading: false,
    commentsLoading: false,
    // 用户
    openid: '',
    userInfo: null
  },

  onLoad: function (options) {
    const id = options.id || '';
    this.setData({ id: id });
    this.initUserInfo();

    if (id) {
      this.loadPhotoDetail();
    } else {
      this.setData({
        loading: false,
        error: '缺少图片ID'
      });
    }
  },

  // 初始化用户信息
  initUserInfo: function () {
    const that = this;
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
    }
    if (app.globalData.openid) {
      this.setData({ openid: app.globalData.openid });
    } else {
      const checkOpenid = setInterval(function () {
        if (app.globalData.openid) {
          that.setData({ openid: app.globalData.openid });
          clearInterval(checkOpenid);
          // 获取到openid后检查点赞状态
          that.checkLikeStatus();
        }
      }, 500);
      setTimeout(function () { clearInterval(checkOpenid); }, 10000);
    }
  },

  // 加载图片详情
  loadPhotoDetail: function () {
    const that = this;
    this.setData({
      loading: true,
      error: ''
    });

    const db = wx.cloud.database();
    db.collection('lab6_photos')
      .doc(this.data.id)
      .get({
        success: function (res) {
          console.log('查询图片详情成功', res);
          const photo = res.data;
          // 兼容老数据
          photo.title = photo.title || '图片分享';
          photo.description = photo.description || '';
          photo.category = photo.category || '其他';
          
          that.setData({
            photo: photo,
            loading: false
          });
          
          // 加载点赞和评论
          that.loadLikeCount();
          that.loadComments();
          if (that.data.openid) {
            that.checkLikeStatus();
          }
        },
        fail: function (err) {
          console.error('查询图片详情失败', err);
          that.setData({
            loading: false,
            error: '加载失败，请返回重试'
          });
        }
      });
  },

  // 加载点赞数
  loadLikeCount: function () {
    const that = this;
    const db = wx.cloud.database();
    
    db.collection('lab6_likes')
      .where({ photoId: this.data.id })
      .count({
        success: function (res) {
          that.setData({ likeCount: res.total || 0 });
        },
        fail: function (err) {
          console.error('查询点赞数失败', err);
        }
      });
  },

  // 检查当前用户是否已点赞
  checkLikeStatus: function () {
    const that = this;
    if (!this.data.openid || !this.data.id) {
      return;
    }

    const db = wx.cloud.database();
    db.collection('lab6_likes')
      .where({
        photoId: this.data.id,
        userOpenid: this.data.openid
      })
      .get({
        success: function (res) {
          that.setData({ isLiked: res.data.length > 0 });
        },
        fail: function (err) {
          console.error('检查点赞状态失败', err);
        }
      });
  },

  // 点赞/取消点赞
  toggleLike: function () {
    const that = this;
    if (this.data.likeLoading || !this.data.openid) {
      if (!this.data.openid) {
        wx.showToast({ title: '正在获取用户信息', icon: 'none' });
      }
      return;
    }

    this.setData({ likeLoading: true });
    const db = wx.cloud.database();

    if (this.data.isLiked) {
      // 取消点赞：删除当前用户的点赞记录
      db.collection('lab6_likes')
        .where({
          photoId: this.data.id,
          userOpenid: this.data.openid
        })
        .get({
          success: function (res) {
            if (res.data.length > 0) {
              const recordId = res.data[0]._id;
              db.collection('lab6_likes').doc(recordId).remove({
                success: function () {
                  that.setData({
                    isLiked: false,
                    likeCount: that.data.likeCount - 1,
                    likeLoading: false
                  });
                },
                fail: function (err) {
                  console.error('取消点赞失败', err);
                  that.setData({ likeLoading: false });
                  wx.showToast({ title: '操作失败', icon: 'none' });
                }
              });
            } else {
              that.setData({
                isLiked: false,
                likeLoading: false
              });
            }
          },
          fail: function (err) {
            console.error('查询点赞记录失败', err);
            that.setData({ likeLoading: false });
          }
        });
    } else {
      // 点赞：添加新记录
      db.collection('lab6_likes').add({
        data: {
          photoId: this.data.id,
          userOpenid: this.data.openid,
          createTime: db.serverDate()
        },
        success: function () {
          that.setData({
            isLiked: true,
            likeCount: that.data.likeCount + 1,
            likeLoading: false
          });
        },
        fail: function (err) {
          console.error('点赞失败', err);
          that.setData({ likeLoading: false });
          wx.showToast({ title: '点赞失败', icon: 'none' });
        }
      });
    }
  },

  // 加载评论
  loadComments: function () {
    const that = this;
    this.setData({ commentsLoading: true });

    const db = wx.cloud.database();
    db.collection('lab6_comments')
      .where({ photoId: this.data.id })
      .orderBy('createTime', 'asc')
      .limit(50)
      .get({
        success: function (res) {
          console.log('查询评论成功', res);
          that.setData({
            comments: res.data,
            commentsLoading: false
          });
        },
        fail: function (err) {
          console.error('查询评论失败', err);
          that.setData({ commentsLoading: false });
        }
      });
  },

  // 评论输入
  onCommentInput: function (e) {
    this.setData({ commentInput: e.detail.value });
  },

  // 发送评论
  sendComment: function () {
    const that = this;
    const content = (this.data.commentInput || '').trim();

    if (!content) {
      wx.showToast({ title: '评论不能为空', icon: 'none' });
      return;
    }
    if (content.length > 100) {
      wx.showToast({ title: '评论最多100字', icon: 'none' });
      return;
    }
    if (this.data.commentLoading) {
      return;
    }
    if (!this.data.openid) {
      wx.showToast({ title: '正在获取用户信息', icon: 'none' });
      return;
    }

    this.setData({ commentLoading: true });
    const db = wx.cloud.database();
    
    // 优先使用lab6_users中的最新资料
    let nickName = '匿名喵友';
    let avatarUrl = '';
    const displayInfo = app.getCurrentUserDisplay ? app.getCurrentUserDisplay() : null;
    if (displayInfo) {
      nickName = displayInfo.nickName || nickName;
      avatarUrl = displayInfo.avatarUrl || avatarUrl;
    } else {
      const userInfo = this.data.userInfo || app.globalData.userInfo || {};
      nickName = userInfo.nickName || nickName;
      avatarUrl = userInfo.avatarUrl || avatarUrl;
    }

    db.collection('lab6_comments').add({
      data: {
        photoId: this.data.id,
        userOpenid: this.data.openid,
        nickName: nickName,
        avatarUrl: avatarUrl,
        content: content,
        createTime: db.serverDate()
      },
      success: function () {
        that.setData({
          commentInput: '',
          commentLoading: false
        });
        wx.showToast({ title: '评论成功', icon: 'success' });
        that.loadComments();
      },
      fail: function (err) {
        console.error('评论失败', err);
        that.setData({ commentLoading: false });
        wx.showToast({ title: '评论失败，请重试', icon: 'none' });
      }
    });
  },

  // 删除评论
  deleteComment: function (e) {
    const that = this;
    const commentId = e.currentTarget.dataset.id;
    const commentOpenid = e.currentTarget.dataset.openid;

    // 只能删除自己的评论
    if (commentOpenid !== this.data.openid) {
      wx.showToast({ title: '只能删除自己的评论', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '删除评论',
      content: '确定要删除这条评论吗？',
      success: function (res) {
        if (res.confirm) {
          const db = wx.cloud.database();
          db.collection('lab6_comments').doc(commentId).remove({
            success: function () {
              wx.showToast({ title: '删除成功', icon: 'success' });
              that.loadComments();
            },
            fail: function (err) {
              console.error('删除评论失败', err);
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 全屏预览图片
  previewImage: function () {
    if (this.data.photo && this.data.photo.photoUrl) {
      wx.previewImage({
        urls: [this.data.photo.photoUrl],
        current: this.data.photo.photoUrl
      });
    }
  },

  // 下载图片到本地
  downloadImage: function () {
    const that = this;
    
    if (!this.data.photo || !this.data.photo.photoUrl) {
      wx.showToast({ title: '图片不存在', icon: 'none' });
      return;
    }

    this.setData({ downloading: true });

    wx.getSetting({
      success: function (res) {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: function () { that.doDownload(); },
            fail: function () {
              wx.showModal({
                title: '需要相册权限',
                content: '保存图片需要访问您的相册，请在设置中开启相册权限',
                confirmText: '去设置',
                success: function (res) {
                  if (res.confirm) { wx.openSetting(); }
                  that.setData({ downloading: false });
                }
              });
            }
          });
        } else {
          that.doDownload();
        }
      },
      fail: function () { that.doDownload(); }
    });
  },

  // 执行下载
  doDownload: function () {
    const that = this;
    const fileID = this.data.photo.photoUrl;

    wx.cloud.downloadFile({
      fileID: fileID,
      success: function (res) {
        console.log('下载文件成功', res);
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: function () {
            wx.showToast({ title: '保存成功', icon: 'success' });
            that.setData({ downloading: false });
          },
          fail: function (err) {
            console.error('保存到相册失败', err);
            wx.showToast({ title: '保存失败', icon: 'none' });
            that.setData({ downloading: false });
          }
        });
      },
      fail: function (err) {
        console.error('下载文件失败', err);
        wx.showToast({ title: '下载失败，请重试', icon: 'none' });
        that.setData({ downloading: false });
      }
    });
  },

  // 分享给微信好友
  onShareAppMessage: function () {
    const photo = this.data.photo;
    const title = photo ? (photo.title || '微信用户分享的图片') : '图片分享';
    const imageUrl = photo ? photo.photoUrl : '';
    
    return {
      title: title,
      path: '/pages/detail/detail?id=' + this.data.id,
      imageUrl: imageUrl
    };
  },

  // 点击用户头像进入主页
  onUserTap: function () {
    const photo = this.data.photo;
    if (photo && (photo._openid || photo.openid)) {
      const openid = photo._openid || photo.openid;
      wx.navigateTo({
        url: '/pages/homepage/homepage?openid=' + openid + '&nickName=' + encodeURIComponent(photo.nickName || '')
      });
    }
  }
});
