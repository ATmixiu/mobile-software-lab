const news = [
  {
    id: '2026082801',
    title: '山东省人民政府副省长、党组成员闫剑波来校调研',
    poster: '/images/news2026_1.jpg',
    content: '8月27日，山东省人民政府副省长、党组成员闫剑波来中国海洋大学调研，学校党委书记李明陪同调研。闫剑波一行参观了学校校史馆、海洋科技成果展和海洋工程技术与装备展，了解学校百年发展历程以及海洋科技创新、服务经济社会发展等情况。学校表示将继续发挥学科综合优势和海洋特色优势，推进科技创新与产业创新深度融合，为国家战略和区域经济社会高质量发展作出更大贡献。',
    add_date: '2026-08-28'
  },

  {
    id: '2026082401',
    title: '中国海洋大学2026级研究生开学典礼举行',
    poster: '/images/news2026_2.jpg',
    content: '8月24日，中国海洋大学2026级研究生开学典礼在崂山校区综合体育馆举行。1134名博士研究生和5092名硕士研究生齐聚海大园，开启新的学习和科研生活。典礼上，学校领导向新同学表示欢迎，并勉励同学们深耕专业方向、加强科研训练、提升创新能力，在人工智能快速发展的时代坚持严谨求实，把个人学术追求融入国家发展需要。',
    add_date: '2026-08-24'
  },

  {
    id: '2026082402',
    title: '中国海洋大学2026级研究生入学报到',
    poster: '/images/news2026_3.jpg',
    content: '8月23日，中国海洋大学2026级研究生新生迎新工作开展，来自全国各地的新生陆续来到海大园报到。学校领导来到迎新现场，了解新生注册、信息采集、住宿以及服务保障等情况。工作人员和志愿者为新生提供校园引导、报到咨询和生活服务，帮助2026级研究生顺利开启新的学习生活。',
    add_date: '2026-08-24'
  }
]

function getNewsList() {
  let list = []

  for (var i = 0; i < news.length; i++) {
    let obj = {}

    obj.id = news[i].id
    obj.poster = news[i].poster
    obj.add_date = news[i].add_date
    obj.title = news[i].title

    list.push(obj)
  }

  return list
}

function getNewsDetail(newsID) {
  let msg = {
    code: '404',
    news: {}
  }

  for (var i = 0; i < news.length; i++) {
    if (newsID == news[i].id) {
      msg.code = '200'
      msg.news = news[i]
      break
    }
  }

  return msg
}

module.exports = {
  getNewsList: getNewsList,
  getNewsDetail: getNewsDetail
}