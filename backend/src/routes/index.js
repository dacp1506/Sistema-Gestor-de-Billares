const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const authRoutes = require('./authRoutes');
const sucursalRoutes = require('./sucursalRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const cajaRoutes = require('./cajaRoutes');
const reservaRoutes = require('./reservaRoutes');
const mesaRoutes = require('./mesaRoutes');
const productoRoutes = require('./productoRoutes');
const ventaRoutes = require('./ventaRoutes');
const sesionRoutes = require('./sesionRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const reportRoutes = require('./reportRoutes');
const configuracionRoutes = require('./configuracionRoutes');
const solicitudRoutes = require('./solicitudRoutes');
const equipoRoutes = require('./equipoRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use(requireAuth);
router.use('/sucursales', sucursalRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/caja', cajaRoutes);
router.use('/reservas', reservaRoutes);
router.use('/mesas', mesaRoutes);
router.use('/productos', productoRoutes);
router.use('/ventas', ventaRoutes);
router.use('/sesiones', sesionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reportes', reportRoutes);
router.use('/configuraciones', configuracionRoutes);
router.use('/solicitudes', solicitudRoutes);
router.use('/equipos', equipoRoutes);

module.exports = router;
