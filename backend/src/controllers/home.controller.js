// datos mockeados para la pagina de inicio, hasta que se conecte con la base de datos

exports.getHomeData = (req, res) => {
    const homeData = {
        success: true,
        data: {
            hero: {
                title: "Economía Circular Inteligente",
                subtitle: "Conectamos cooperativas, recicladoras y emprendedores para fortalecer el impacto ambiental local",
                buttons: {
                    explore: "/explorar",
                    publish: "/publicar"
                }
            },
            metrics: {
                intercambios: {
                    value: 3450,
                    label: "Intercambios",
                    trend: "+12% este mes" // opcional
                },
                reutilizados: {
                    value: 19000,
                    unit: "kg",
                    label: "Reutilizados",
                    trend: "+8% este mes"
                },
                activos: {
                    value: 600,
                    label: "Activos",
                    trend: "+15 nuevos esta semana"
                }
            },
            actors: {
                cooperativas: {
                    count: 45,
                    label: "Cooperativas",
                    icon: "coop-icon",
                    recent: [
                        { name: "Recicla Sur", location: "Zona Sur" }
                        // etc
                    ]
                },
                recicladoras: {
                    count: 28,
                    label: "Recicladoras",
                    icon: "recycler-icon",
                    recent: []
                },
                emprendedores: {
                    count: 156,
                    label: "Emprendedores",
                    icon: "entrepreneur-icon",
                    recent: []
                }
            },
            recentActivities: [ // opcional pero util
                {
                    type: "intercambio",
                    actor: "Cooperativa Verde",
                    material: "Plástico PET",
                    amount: "150kg",
                    date: "2024-03-20"
                }
            ]
        }
    };
    
    res.json(homeData);
};