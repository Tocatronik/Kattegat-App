# PROYECTO: Transformación Digital Arpapel con AI

## Contexto de la Empresa
- **Empresa**: Productos Arpapel S.A. de C.V.
- **Giro**: Distribución mayorista de papel, productos escolares, oficina y creativos
- **Sede**: Naucalpan, Estado de México (+ Guadalajara y otras)
- **Empleados**: ~760 (250 administrativos, ~510 operativos)
- **SKUs**: 800+
- **Volumen**: Miles de toneladas de papel/mes
- **ERP actual**: QAD (legacy, complejo, costoso por usuario)
- **Comunicación**: Microsoft Outlook
- **IT**: Equipo interno desarrollando conectores entre módulos QAD
- **Divisiones**: Incluye papeles escolares (mapeada), y otras

## Problema Principal
- QAD es complejo, caro (licencias por usuario), y rígido
- Demasiados pasos manuales de punto A a punto B
- 250 administrativos es excesivo — muchos procesos repetitivos
- Código existente para conectar módulos QAD, pero sin automatización inteligente
- Falta visibilidad en tiempo real del negocio

## Arquitectura Propuesta

### Stack Tecnológico
1. **Claude API** (Haiku/Sonnet) — cerebro AI para análisis, decisiones, procesamiento de lenguaje natural
2. **N8N** (self-hosted en Mac Mini) — motor de workflows/automatización, conecta todo
3. **Supabase** o PostgreSQL — base de datos moderna para dashboards y reportes
4. **OpenClaw** (opcional) — agente local para tareas en la máquina (email, archivos)
5. **QAD** — se mantiene como sistema core, pero se automatiza su operación
6. **Telegram Bot** — interface móvil para alertas y consultas rápidas
7. **Web App (React)** — dashboards ejecutivos y herramientas internas

### Infraestructura
- 2-3 Mac Minis M4 (servidores locales en oficina de Arpapel)
  - Mac Mini 1: N8N + agentes AI
  - Mac Mini 2: Base de datos, dashboards, backups
  - Mac Mini 3 (opcional): Procesamiento AI pesado, batch jobs
- Todo corre en red local para datos sensibles
- Claude API solo envía consultas procesadas (sin data cruda sensible)

## Fases de Implementación

### FASE 1: Visibilidad (Mes 1-2)
**Objetivo**: Ver qué está pasando en tiempo real sin cambiar procesos
- Conectar QAD → Supabase (sync de tablas clave: ventas, inventario, clientes, pedidos)
- Dashboard ejecutivo web (como el de Kattegat pero a escala Arpapel)
- KPIs: ventas diarias, inventario por SKU, pedidos pendientes, CxC, CxP
- Alertas Telegram para métricas fuera de rango
- **Impacto**: Dirección tiene visibilidad sin depender de reportes manuales

### FASE 2: Automatización de Procesos Repetitivos (Mes 2-4)
**Objetivo**: Eliminar tareas manuales con N8N workflows
- **Email → Pedidos**: ODCs que llegan por Outlook se parsean automáticamente y crean pedidos en QAD
- **Facturación automática**: Al completar un pedido, se genera CFDI automáticamente
- **Cobranza**: Recordatorios automáticos de CxC vencidas por email
- **Inventario**: Alertas de reorden cuando stock baje de mínimo
- **Reportes**: Generación automática de reportes diarios/semanales
- **Impacto**: Reducción inmediata de 30-40% de trabajo administrativo repetitivo

### FASE 3: AI para Decisiones (Mes 4-6)
**Objetivo**: Claude analiza datos y sugiere acciones
- Chatbot interno (como Kattegat AI) con contexto completo del negocio
- Predicción de demanda por SKU basada en históricos
- Optimización de rutas de distribución
- Análisis de rentabilidad por cliente/producto
- Detección de anomalías (fraude, errores, desperdicios)
- **Impacto**: Mejores decisiones, más rápidas, basadas en datos

### FASE 4: Agentes Autónomos (Mes 6-12)
**Objetivo**: AI maneja procesos completos con supervisión humana
- Agente de compras: analiza inventario, genera órdenes de compra, negocia con proveedores
- Agente de ventas: follow-up automático con clientes, cotizaciones, CRM
- Agente de logística: optimiza entregas, coordina con transportistas
- Agente de RRHH: nómina, asistencia, evaluaciones
- **Modelo**: 1 persona + AI por área en lugar de equipos grandes
- **Impacto**: Reducción significativa de headcount administrativo

## Mapeo de Áreas y Automatización

| Área | Personas Actual (est.) | Con AI | Ahorro |
|------|----------------------|--------|--------|
| Ventas/Comercial | 40-50 | 8-10 + AI | 75% |
| Compras | 15-20 | 3-4 + AI | 80% |
| Almacén/Logística | 30-40 admin | 5-8 + AI | 75% |
| Contabilidad/Finanzas | 20-30 | 4-6 + AI | 80% |
| CxC/Cobranza | 15-20 | 2-3 + AI | 85% |
| RRHH/Nómina | 10-15 | 2-3 + AI | 80% |
| IT | 10-15 | 5-8 | 40% |
| Dirección/Gerencia | 15-20 | 10-15 | 25% |
| Servicio al Cliente | 20-30 | 3-5 + AI | 85% |
| Otros Admins | 30-40 | 5-10 + AI | 75% |
| **TOTAL ADMIN** | **~250** | **~55-80** | **~70%** |

## Consideraciones de Seguridad
- Datos sensibles (financieros, clientes, precios) NO salen de la red local
- Claude API recibe solo consultas procesadas/anonimizadas cuando es necesario
- Backups automáticos diarios
- Control de acceso por roles (igual que Kattegat ERP)
- Auditoría de todas las acciones AI

## Costos Estimados
- Mac Mini M4 16GB: ~$600 USD x 2-3 = $1,200-1,800
- Claude API (Haiku): ~$50-100/mes para uso empresarial
- N8N: Gratis (self-hosted)
- Supabase: Gratis hasta cierto volumen, después ~$25/mes
- Desarrollo: El trabajo de Claude contigo
- **Total setup**: ~$2,000-3,000 USD
- **Costo mensual**: ~$100-200 USD
- **Ahorro potencial**: Reducción de 170+ posiciones administrativas

## Próximos Pasos Inmediatos
1. Obtener acceso a una base de datos de prueba de QAD (read-only)
2. Mapear las rutas/procesos de papeles escolares (ya tiene el Excel)
3. Identificar los 5 procesos más repetitivos y de mayor volumen
4. Instalar Mac Mini con N8N y conectar a QAD
5. Crear dashboard piloto con datos reales
6. Probar con 1 área primero (ej: ventas o cobranza)

## Notas Técnicas para IT de Arpapel
- QAD tiene APIs o se puede conectar via base de datos directa (Progress/OpenEdge)
- N8N tiene nodos para bases de datos SQL, REST APIs, email (IMAP/SMTP)
- El código existente de IT para conectar módulos QAD se puede reusar como base
- Claude API es stateless — no almacena datos entre llamadas
- Todo el stack es modular — se puede reemplazar cualquier componente
