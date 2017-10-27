const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  const limit = (req.query.limit) ? req.query.limit : 10;
  const offset = (req.query.offset) ? req.query.offset : 0;

  request(`http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${ req.params.id }`, (err, response, body) => {
    const reviews = JSON.parse(body)[0].reviews;
    console.log('err', err);
    console.log('response', response);
    console.log('body', body);

    res.json({
      recommendations: reviews,
      meta: {
        limit: limit,
        offset: offset
      }
    });
  });
}

module.exports = app;
