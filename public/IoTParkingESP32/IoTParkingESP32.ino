#define BLYNK_TEMPLATE_ID "TMPL2DXYbdHm9"
#define BLYNK_TEMPLATE_NAME "EVC Parking"
#define BLYNK_AUTH_TOKEN "bNmslPAHQNMY34sV3AvYEe_7Jr8qv2qT"

#include <Wire.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <ESP32Servo.h>

// Pines de los sensores
#define SENSOR1 4
#define SENSOR2 15
#define SENSOR3 5
#define SENSOR4 19

// Pines de los servos
#define SERVO_ENTRADA_PIN 14
#define SERVO_SALIDA_PIN 27

BlynkTimer timer;

// Credenciales de Blynk y WiFi
char auth[] = BLYNK_AUTH_TOKEN;
char ssid[] = "AMARANTO 4G";
char pass[] = "Victordag09";

// LEDs virtuales en Blynk
WidgetLED LED1(V0);
WidgetLED LED2(V1);
WidgetLED LED3(V2);
WidgetLED LED4(V3);

// Objetos Servo
Servo servoEntrada;
Servo servoSalida;

// Variables para almacenar posiciones de los servos
int posicionServoEntrada = 0;
int posicionServoSalida = 0;

void setup() {
  Serial.begin(115200);
  Blynk.begin(auth, ssid, pass, "blynk.cloud", 80);

  // Configuración de pines de sensores
  pinMode(SENSOR1, INPUT_PULLUP);
  pinMode(SENSOR2, INPUT_PULLUP);
  pinMode(SENSOR3, INPUT_PULLUP);
  pinMode(SENSOR4, INPUT_PULLUP);

  // Inicialización de servos
  servoEntrada.attach(SERVO_ENTRADA_PIN);
  servoSalida.attach(SERVO_SALIDA_PIN);

  // Posición inicial de los servos
  servoEntrada.write(0);  // Posición neutra (0 grados)
  servoSalida.write(0);   // Posición neutra (0 grados)

  // Configura un temporizador para llamar a la función cada 200 ms
  timer.setInterval(200L, sensor);
}

void sensor() {
  int L1 = digitalRead(SENSOR1);
  int L2 = digitalRead(SENSOR2);
  int L3 = digitalRead(SENSOR3);
  int L4 = digitalRead(SENSOR4);

  // Actualizar el estado en Blynk (1 = Disponible, 0 = Ocupado)
  Blynk.virtualWrite(V0, L1 == HIGH ? 1 : 0);  // Espacio 1
  Blynk.virtualWrite(V1, L2 == HIGH ? 1 : 0);  // Espacio 2
  Blynk.virtualWrite(V2, L3 == HIGH ? 1 : 0);  // Espacio 3
  Blynk.virtualWrite(V3, L4 == HIGH ? 1 : 0);  // Espacio 4

  // Información para depuración
  Serial.println("Sensor 1: " + String(L1 == HIGH ? "Disponible" : "Ocupado"));
  Serial.println("Sensor 2: " + String(L2 == HIGH ? "Disponible" : "Ocupado"));
  Serial.println("Sensor 3: " + String(L3 == HIGH ? "Disponible" : "Ocupado"));
  Serial.println("Sensor 4: " + String(L4 == HIGH ? "Disponible" : "Ocupado"));
}

// Control del servo de entrada desde Blynk (Switch)
BLYNK_WRITE(V4) {
  int estado = param.asInt(); // Lee el estado del interruptor (1 o 0)
  if (estado == 1) {
    servoEntrada.write(90); // Mueve el servo de entrada a 90 grados
    Serial.println("Servo de entrada subido a 90 grados");
  } else {
    servoEntrada.write(0);  // Mueve el servo de entrada a 0 grados
    Serial.println("Servo de entrada bajado a 0 grados");
  }
}

// Control del servo de salida desde Blynk (Switch)
BLYNK_WRITE(V5) {
  int estado = param.asInt(); // Lee el estado del interruptor (1 o 0)
  if (estado == 1) {
    servoSalida.write(90); // Mueve el servo de salida a 90 grados
    Serial.println("Servo de salida subido a 90 grados");
  } else {
    servoSalida.write(0);  // Mueve el servo de salida a 0 grados
    Serial.println("Servo de salida bajado a 0 grados");
  }
}

void loop() {
  Blynk.run();
  timer.run();
}
