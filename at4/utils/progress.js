// utils/progress.js


// 获取解锁关卡

function getUnlockLevel(){


  let level = wx.getStorageSync(
    "unlockLevel"
  )


  if(!level){


    level = 0


  }


  return level

}







// 解锁下一关

function unlock(level){



  let current = getUnlockLevel()



  if(level > current){



    wx.setStorageSync(

      "unlockLevel",

      level

    )


  }



}







// 获取最佳步数

function getBest(level){



  let key = "best_"+level



  return wx.getStorageSync(key) || null



}







// 保存最佳步数


function saveBest(level,steps){



  let old = getBest(level)



  if(

    old==null ||

    steps<old

  ){



    wx.setStorageSync(

      "best_"+level,

      steps

    )


  }


}







module.exports={


  getUnlockLevel,


  unlock,


  getBest,


  saveBest


}