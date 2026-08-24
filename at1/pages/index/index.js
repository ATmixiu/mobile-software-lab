// index.js
Page({
  data:{
    index:0,
    wording:[
      'hello！',
      "little tiger！"
    ],
    imageSrc:[
      "../../images/com.xingin.xhs_20260824133911.png",
      "../../images/com.xingin.xhs_20260824132958.png"
    ],
    buttontext:[
      "开始扫地",
      "松开"
    ]
  },
  onClick:function(){
    this.setData({
      index:1-this.data.index
    })
  }
})
