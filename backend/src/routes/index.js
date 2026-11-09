const express = require('express');
const sucursalRoutes = require('./sucursalRoutes');
const mesaRoutes = require('./mesaRoutes');
const productoRoutes = require('./productoRoutes');
const ventaRoutes = require('./ventaRoutes');
const sesionRoutes = require('./sesionRoutes');

const router = express.Router();

router.use('/sucursales', sucursalRoutes);
router.use('/mesas', mesaRoutes);
router.use('/productos', productoRoutes);
router.use('/ventas', ventaRoutes);
router.use('/sesiones', sesionRoutes);

module.exports = router;
