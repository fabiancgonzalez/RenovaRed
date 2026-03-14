class DailyStatsDTO {
  // Todos los campos de un registro de estadísticas diarias
  static full(stat) {
    return {
      id: stat.id,
      fecha: stat.fecha,
      nuevos_usuarios: stat.nuevos_usuarios,
      nuevas_publicaciones: stat.nuevas_publicaciones,
      intercambios_completados: stat.intercambios_completados,
      kg_reutilizados: stat.kg_reutilizados,
      co2_ahorrado_kg: stat.co2_ahorrado_kg,
      cooperativas_activas: stat.cooperativas_activas,
      recicladoras_activas: stat.recicladoras_activas,
      emprendedores_activos: stat.emprendedores_activos,
      zonas_activas: stat.zonas_activas,
      created_at: stat.created_at
    };
  }

  // Resumen con métricas principales (para dashboards o listados)
  static summary(stat) {
    return {
      fecha: stat.fecha,
      nuevos_usuarios: stat.nuevos_usuarios,
      nuevas_publicaciones: stat.nuevas_publicaciones,
      intercambios_completados: stat.intercambios_completados,
      kg_reutilizados: stat.kg_reutilizados,
      co2_ahorrado_kg: stat.co2_ahorrado_kg
    };
  }
}

module.exports = DailyStatsDTO;
