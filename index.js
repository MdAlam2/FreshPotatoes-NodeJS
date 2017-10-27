const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      dotenv = require('dotenv'),
      express = require('express'),
      app = express();

// require('dotenv').config();

// const {
//   PORT=3000,
//   NODE_ENV='development',
//   DB_PATH='./db/database.db'
// } = process.env;

// const {
//   DB_HOST='',
//   DB_NAME='',
//   DB_USER='',
//   DB_PASSWORD='',
//   DB_DIALECT='sqlite',
//   DB_PATH='./db/database.db',
//   PORT=3000,
//   NODE_ENV='development'
// } = process.env;

const API_BASE_URL = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';
const ERR_BAD_REQUEST = '"message" key missing';

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'sqlite',
  storage: './db/database.db'
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection established successfully');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const Film = sequelize.import('./models/film');
const Genre = sequelize.import('./models/genre');

// Film.hasOne(Genre, { foreignKey: 'genre_id' });

// START SERVER
Promise.resolve()
  .then(() => {
    // app.listen(PORT, () => console.log(`App listening on port ${PORT}`))
    app.listen(3000, () => console.log(`App listening on port 3000`))
  })
  .catch((err) => {
    // if (NODE_ENV === 'development') console.error(err.stack);
    console.error(err.stack)
  });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

app.get('*', function(req, res){
  res.status(404).json({
    message: ERR_BAD_REQUEST
  })
});

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  console.log('Running getFilmRecommendations');
  let limit = 10, offset = 0;

  if (!Number.isInteger(parseInt(req.params.id, 10))) {
    res.status(422).json({
      message: ERR_BAD_REQUEST
    });
  }

  if (req.query.limit) {
    if (!Number.isInteger(parseInt(req.query.limit, 10))) {
      res.status(422).json({
        message: ERR_BAD_REQUEST
      });
    }

    limit = parseInt(req.query.limit, 10);
  }

  if (req.query.offset) {
    if (!Number.isInteger(parseInt(req.query.offset, 10))) {
      res.status(422).json({
        message: ERR_BAD_REQUEST
      });
    }

    offset = parseInt(req.query.offset, 10);
  }

  Film.findById(req.params.id, {})
    .then(film => {
      console.log('film', film);
      Genre.findById(film.genre_id, {})
        .then(genre => {
          console.log('genre', genre);

          let startDate = new Date(film.release_date);
          startDate.setFullYear(startDate.getFullYear() - 15);

          let endDate = new Date(film.release_date);
          endDate.setFullYear(endDate.getFullYear() + 15);

          console.log('original', film.release_date, 'start', startDate, 'end', endDate);

          Film.all({
            where: {
              genre_id: film.genre_id,
              release_date: {
                $between: [startDate, endDate]
              }
            },
            order: ['id']
          })
          .then(films => {
            const film_ids = films.map(film => {
              return film.id
            });

            const film_ids_str = film_ids.join(',');

            console.log('film_ids_str', film_ids_str);

            request(`${ API_BASE_URL }?films=${ film_ids_str }`, (err, response, body) => {
              const reviewedFilms = JSON.parse(body);
              console.log('err', err);
              console.log('response', response);
              console.log('body', body);

              console.log('reviewedFilms.length', reviewedFilms.length);

              // Must have 5 reviews at least
              const reviewedFilmsOverFive = reviewedFilms.filter(reviewedFilm => {
                return reviewedFilm.reviews.length >= 5;
              });

              console.log('reviewedFilmsOverFive', reviewedFilmsOverFive.length);

              const reviewedFilmsWithAverage = reviewedFilmsOverFive.map(reviewedFilm => {
                const totalRating = reviewedFilm.reviews.reduce((sum, val) => {
                  return sum + val.rating;
                }, 0);

                const averageRating = totalRating / reviewedFilm.reviews.length;
                reviewedFilm.average_rating = averageRating;

                return reviewedFilm;
              });

              // Has to have more than average 4
              const reviewedFilmsAboveAverage = reviewedFilmsWithAverage.filter(reviewedFilm => {
                return reviewedFilm.average_rating > 4;
              });

              console.log('reviewedFilmsAboveAverage length', reviewedFilmsAboveAverage.length);
              console.log('reviewedFilmsAboveAverage', reviewedFilmsAboveAverage);

              const reviewedFilmsAboveAverageIds = reviewedFilmsAboveAverage.map(film => {
                console.log('film', film);
                return film.film_id;
              });
              // reviewedFilmsAboveAverageIdsStr = reviewedFilmsAboveAverageIds.join(',');

              console.log('reviewedFilmsAboveAverageIds', reviewedFilmsAboveAverageIds);

              Film.all({
                attributes: ['id', 'title', 'release_date'],
                where: { 'id': { in: reviewedFilmsAboveAverageIds }},
                order: ['id']
              })
              .then(recommendedFilms => {
                const finalRecommendedFilms = recommendedFilms.map(film => {
                  const matchedFilm = reviewedFilmsAboveAverage.find((element) => {
                    // console.log('element', element);
                    // console.log('film', film);
                    return element.film_id = film.id;
                  })

                  console.log('matchedFilm', matchedFilm);

                  return {
                    id: matchedFilm.film_id,
                    title: film.title,
                    releaseDate: film.release_date,
                    genre: genre.name,
                    averageRating: matchedFilm.average_rating,
                    reviews: matchedFilm.reviews.length
                  }
                })

                res.json({
                  // original: JSON.parse(body),
                  recommendations: finalRecommendedFilms,
                  meta: {
                    limit: limit,
                    offset: offset
                  }
                });
              })
              .catch(err => {
                res.status(500).json(err);
              });


            });
          })
          .catch(err => {
            res.status(500).json(err);
          });


        })
        .catch(err => {
          res.status(500).json(err);
        });
    })
    .catch(err => {
      res.status(500).json(err);
    });


}

module.exports = app;
