module.exports = function(sequelize, DataTypes) {
  return sequelize.define('film', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.TEXT
    },
    release_date: {
      type: DataTypes.DATEONLY
    },
    tagline: {
      type: DataTypes.TEXT
    },
    revenue: {
      type: DataTypes.INTEGER
    },
    budget: {
      type: DataTypes.INTEGER
    },
    runtime: {
      type: DataTypes.INTEGER
    },
    original_language: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.TEXT
    },
    genre_id: {
      type: DataTypes.INTEGER
    }
  }, {
    underscored: true
  });
}
