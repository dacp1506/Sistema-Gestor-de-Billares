const express = require('express');
const controller = require('../controllers/solicitudesController');
const router = express.Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.detail);
router.put('/:id', controller.update);
router.patch('/:id/estado', controller.changeState);
router.delete('/:id', controller.logicalDelete);

module.exports = router;

