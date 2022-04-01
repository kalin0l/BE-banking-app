const express = require('express');
const movementController = require('./../controllers/movementController')
const router = express.Router();

router.get('/:uid',movementController.getMovUserId)

router.post('/',movementController.createMov);


module.exports = router;