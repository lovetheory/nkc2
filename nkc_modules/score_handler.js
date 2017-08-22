const express = require('express');
const router = express.Router();
const scoreMap = require('./server_settings').scoreMap;

router.use('/operation', (req, res, next) => {
  if(req.operation in scoreMap) {

  }
})