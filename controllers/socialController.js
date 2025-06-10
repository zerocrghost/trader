const { getSocialPosts } = require("../utils/utils");
const socialPostModel = require("../model/socialPost.model");

const checkSocial = async (req, res) => {
  try {
    if (!req.body.mint) return res.status(400).send({ error: "Mint Undefined" })
    if (!req.body.progress || typeof req.body.progress !== 'number' || req.body.progress % 10 !== 0)
      return res.status(400).send({ error: "Progress Number Invalid" })

    const { mint, progress } = req.body
    if (Number(progress) < 100) {
      console.log("BOdy: ", req.body)
      return res.status(400).send({ msg: "not enough progress" })
    }
    // Check this mint has social fetch for this progress
    const socialHis = await socialPostModel.find({ mint, progress })
    if (socialHis.length > 0)
      return res.status(200).send({ msg: "Already fetched social info for this progress" })

    // const fetchCreator = getSocialCreators(mint)
    const posts = await getSocialPosts(mint)
    console.log(posts)
    // const promsies = Promise.all([fetchCreator, fetchPost])
    // const promiseRes = await promsies.then()
    // const creators = promiseRes[0]
    if (posts?.length === 0) {
      return res.status(404).send({ data: [] })
    } else {
      // Save First Post
      const firstPost = posts.sort((a, b) => b.post_created - a.post_created)[0]
      const newFirstPost = new socialPostModel({
        mint,
        progress,
        postId: firstPost.id,
        postTitle: firstPost.post_title,
        postLink: firstPost.post_link,
        postCreated: firstPost.post_created,
        postSentiment: firstPost.post_sentiment,
        creatorId: firstPost.creator_id,
        creatorFollowers: firstPost.creator_followers,
        interactionsTotal: firstPost.interactions_total,
        interactions24H: firstPost.interactions_24h,
        firstPost: true,
      })
      await newFirstPost.save()

      // Get top creator's post
      let topPost = posts.sort((a, b) => b.interactions_total - a.interactions_total)[0]
      const newTopPost = new socialPostModel({
        mint,
        progress,
        postId: topPost.id,
        postTitle: topPost.post_title,
        postLink: topPost.post_link,
        postCreated: topPost.post_created,
        postSentiment: topPost.post_sentiment,
        creatorId: topPost.creator_id,
        creatorFollowers: topPost.creator_followers,
        interactionsTotal: topPost.interactions_total,
        interactions24H: topPost.interactions_24h,
        firstPost: false,

      })
      await newTopPost.save()

      return res.status(200).send({ data: [firstPost, topPost] })
    }
  } catch (err) {
    console.log("Social error: ", err)
    return res.status(400).send({ error: "Fetch social error" })
  }
}

// const getSocialCreators = async (req, res) => {
//   try {
//     if (!!req.params.topic) return res.status(400).send({ error: "Topic Undefined" })
//     const response = await axios({
//       url: `${socialAPI}/topic/${req.params.topic}/creators/v1`,
//       method: "get",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${process.env.LUNAR_TOKEN}`
//       },

//     });

//     return response.data[0]
//   } catch (err) {
//     throw (err)
//   }
// }

// const getSocialPosts = async (req, res) => {
//   try {
//     if (!!req.params.topic) return res.status(400).send({ error: "Topic Undefined" })
//     const response = await axios({
//       url: `${socialAPI}/topic/${req.params.topic}/posts/v1`,
//       method: "get",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${process.env.LUNAR_TOKEN}`
//       },

//     });

//     return response.data[0]
//   } catch (err) {
//     throw (err)
//   }
// }

module.exports = {
  checkSocial
}