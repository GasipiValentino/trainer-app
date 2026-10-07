-- Biblioteca global de ejercicios (teacher_id NULL). Idempotente por nombre.
insert into public.exercises (name, muscle_group, equipment)
select v.name, v.muscle_group, v.equipment
from (values
  -- Pecho
  ('Press banca', 'Pecho', 'Barra'),
  ('Press inclinado con barra', 'Pecho', 'Barra'),
  ('Press inclinado con mancuernas', 'Pecho', 'Mancuernas'),
  ('Press plano con mancuernas', 'Pecho', 'Mancuernas'),
  ('Aperturas con mancuernas', 'Pecho', 'Mancuernas'),
  ('Cruce de poleas', 'Pecho', 'Polea'),
  ('Fondos en paralelas', 'Pecho', 'Peso corporal'),
  ('Flexiones de brazos', 'Pecho', 'Peso corporal'),
  ('Press en máquina', 'Pecho', 'Máquina'),
  -- Espalda
  ('Dominadas', 'Espalda', 'Peso corporal'),
  ('Dominadas lastradas', 'Espalda', 'Peso corporal'),
  ('Jalón al pecho', 'Espalda', 'Polea'),
  ('Remo con barra', 'Espalda', 'Barra'),
  ('Remo con mancuerna', 'Espalda', 'Mancuernas'),
  ('Remo en polea baja', 'Espalda', 'Polea'),
  ('Remo invertido', 'Espalda', 'Peso corporal'),
  ('Pullover en polea', 'Espalda', 'Polea'),
  ('Remo en máquina', 'Espalda', 'Máquina'),
  -- Hombros
  ('Press militar', 'Hombros', 'Barra'),
  ('Press de hombros con mancuernas', 'Hombros', 'Mancuernas'),
  ('Vuelos laterales', 'Hombros', 'Mancuernas'),
  ('Vuelos posteriores', 'Hombros', 'Mancuernas'),
  ('Face pull', 'Hombros', 'Polea'),
  ('Elevaciones laterales en polea', 'Hombros', 'Polea'),
  ('Press Arnold', 'Hombros', 'Mancuernas'),
  -- Piernas
  ('Sentadilla trasera', 'Piernas', 'Barra'),
  ('Sentadilla frontal', 'Piernas', 'Barra'),
  ('Sentadilla goblet', 'Piernas', 'Mancuernas'),
  ('Peso muerto', 'Piernas', 'Barra'),
  ('Peso muerto rumano', 'Piernas', 'Barra'),
  ('Prensa de piernas', 'Piernas', 'Máquina'),
  ('Estocadas con mancuernas', 'Piernas', 'Mancuernas'),
  ('Sentadilla búlgara', 'Piernas', 'Mancuernas'),
  ('Hip thrust', 'Piernas', 'Barra'),
  ('Extensión de cuádriceps', 'Piernas', 'Máquina'),
  ('Curl femoral acostado', 'Piernas', 'Máquina'),
  ('Elevación de talones de pie', 'Piernas', 'Máquina'),
  ('Step-up al cajón', 'Piernas', 'Mancuernas'),
  ('Puente de glúteos', 'Piernas', 'Peso corporal'),
  ('Sentadilla a cajón', 'Piernas', 'Peso corporal'),
  ('Isometría de cuádriceps en pared', 'Piernas', 'Peso corporal'),
  ('Extensión terminal de rodilla con banda', 'Piernas', 'Banda'),
  -- Brazos
  ('Curl con barra', 'Brazos', 'Barra'),
  ('Curl martillo', 'Brazos', 'Mancuernas'),
  ('Curl en polea', 'Brazos', 'Polea'),
  ('Extensión de tríceps en polea', 'Brazos', 'Polea'),
  ('Press francés', 'Brazos', 'Barra'),
  ('Fondos en banco', 'Brazos', 'Peso corporal'),
  -- Core
  ('Plancha', 'Core', 'Peso corporal'),
  ('Plancha lateral', 'Core', 'Peso corporal'),
  ('Dead bug', 'Core', 'Peso corporal'),
  ('Pallof press', 'Core', 'Polea'),
  ('Rueda abdominal', 'Core', 'Rueda'),
  ('Elevación de piernas colgado', 'Core', 'Peso corporal'),
  ('Paseo del granjero', 'Core', 'Mancuernas'),
  -- Cardio / acondicionamiento
  ('Remo ergómetro', 'Cardio', 'Máquina'),
  ('Bicicleta fija', 'Cardio', 'Máquina'),
  ('Caminata en cinta inclinada', 'Cardio', 'Máquina'),
  ('Swing con kettlebell', 'Cardio', 'Kettlebell'),
  ('Burpees', 'Cardio', 'Peso corporal')
) as v(name, muscle_group, equipment)
where not exists (
  select 1 from public.exercises e where e.teacher_id is null and e.name = v.name
);
