# Preguntas para Reunión con IT - Proyecto Migración QAD

## 1. QAD y Base de Datos
- ¿Qué versión de QAD tienen? (QE, SE, EA)
- ¿Qué versión de Progress OpenEdge? (10, 11, 12?)
- ¿Cuántas licencias de QAD pagan y cuánto cuesta cada una?
- ¿Cuánto pagan anualmente en total por QAD? (licencias + mantenimiento + soporte)
- ¿Tamaño aproximado de la base de datos? (GB)
- ¿Cuántas tablas principales usan activamente?
- ¿Tienen acceso a los esquemas/definiciones de tablas?
- ¿Pueden exportar un dump/backup de la base de datos?

## 2. Infraestructura Actual
- ¿Qué servidores tienen? (físicos, VMs, cloud?)
- ¿Sistema operativo de los servidores? (Windows Server, Linux?)
- ¿Red local: velocidad, VLANs, VPN para acceso remoto?
- ¿Tienen rack con espacio para Mac Minis?
- ¿Conexión a internet: velocidad, IP fija?
- ¿Usan Active Directory / LDAP para usuarios?
- ¿Política de backups actual?

## 3. Integraciones Existentes
- ¿Qué sistemas están conectados a QAD hoy?
- ¿Código custom que conecta módulos: en qué lenguaje? (4GL, Python, C#?)
- ¿Usan APIs REST de QAD (PASOE) o conexión directa a DB?
- ¿Hay integraciones con bancos, SAT, transportistas?
- ¿Usan algún EDI (intercambio electrónico) con clientes/proveedores?

## 4. Módulos de QAD que Usan
Marcar cuáles usan activamente:
- [ ] Ventas / Sales Orders
- [ ] Compras / Purchase Orders
- [ ] Inventario / Item Master
- [ ] Almacén / Warehouse Management
- [ ] Manufactura / Work Orders (si aplica)
- [ ] Contabilidad / General Ledger
- [ ] CxC / Accounts Receivable
- [ ] CxP / Accounts Payable
- [ ] Facturación / Billing
- [ ] Logística / Shipping
- [ ] RRHH / Nómina
- [ ] Calidad
- [ ] Planeación / MRP
- [ ] Reportes / Business Intelligence

## 5. Usuarios y Acceso
- ¿Cuántos usuarios activos tiene QAD hoy?
- ¿Cuántos son concurrentes (conectados al mismo tiempo)?
- ¿Cómo acceden? (terminal, web, Citrix, remoto?)
- ¿Hay usuarios en otras sedes? (Guadalajara, etc.)

## 6. Datos Críticos a Migrar
- ¿Cuántos años de historial tienen en QAD?
- ¿Cuántos clientes activos?
- ¿Cuántos proveedores activos?
- ¿Cuántos SKUs activos?
- ¿Volumen de transacciones diarias? (facturas, pedidos, movimientos)
- ¿Hay datos que NO están en QAD? (Excel, otros sistemas)

## 7. Pain Points
- ¿Qué es lo que más les duele de QAD?
- ¿Qué procesos son los más lentos/manuales?
- ¿Qué reportes les cuesta más trabajo sacar?
- ¿Qué ha intentado IT mejorar y no ha podido?
- ¿Cuándo vence el contrato de QAD?

## 8. Para el Screenshot de Acceso a QAD
- ¿Es acceso read-only o read-write?
- ¿Desde qué IP/red se puede acceder?
- ¿Necesito VPN?
- ¿Puedo acceder a la base de datos directamente (JDBC/ODBC)?

## Dato Clave para Presupuesto
Si QAD cuesta (ejemplo) $200,000 - $500,000 USD al año en licencias, y el sistema nuevo costaría $5,000-8,000 de setup + $500/mes... el ROI es inmediato. Necesitamos saber el costo exacto de QAD para hacer el business case.
