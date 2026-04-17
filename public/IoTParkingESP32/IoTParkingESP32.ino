// TODO: Integrar la plataforma IoT cloud de destino aquí
// La lógica de sensores y servos está lista; solo falta el puente de comunicación.

#include <Wire.h>
#include <WiFi.h>
#include <ESP32Servo.h>

// Pines de los sensores
#define SENSOR1 4
#define SENSOR2 15
#define SENSOR3 5
#define SENSOR4 19

// Pines de los servos
#define SERVO_ENTRADA_PIN 14
#define SERVO_SALIDA_PIN 27

// Credenciales WiFi
char ssid[] = "TU_SSID";
char pass[] = "TU_CONTRASEÑA";

// Objetos Servo
Servo servoEntrada;
Servo servoSalida;

unsigned long lastSensorCheck = 0;
const unsigned long SENSOR_INTERVAL = 200;

void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado");

  // TODO: Inicializar plataforma IoT aquí

  pinMode(SENSOR1, INPUT_PULLUP);
  pinMode(SENSOR2, INPUT_PULLUP);
  pinMode(SENSOR3, INPUT_PULLUP);
  pinMode(SENSOR4, INPUT_PULLUP);

  servoEntrada.attach(SERVO_ENTRADA_PIN);
  servoSalida.attach(SERVO_SALIDA_PIN);
  servoEntrada.write(0);
  servoSalida.write(0);
}

void leerSensores() {
  int L1 = digitalRead(SENSOR1);
  int L2 = digitalRead(SENSOR2);
  int L3 = digitalRead(SENSOR3);
  int L4 = digitalRead(SENSOR4);

  // Convención: 1 = Disponible, 0 = Ocupado
  // Identificadores de espacio en Firestore: space0, space1, space2, space3
  // TODO: Enviar estos valores a la plataforma IoT / Firestore
  // space0 → L1 == HIGH ? 1 : 0
  // space1 → L2 == HIGH ? 1 : 0
  // space2 → L3 == HIGH ? 1 : 0
  // space3 → L4 == HIGH ? 1 : 0

  Serial.println("Sensor 1: " + String(L1 == HIGH ? "Disponible" : "Ocupado"));
  Serial.println("Sensor 2: " + String(L2 == HIGH ? "Disponible" : "Ocupado"));
  Serial.println("Sensor 3: " + String(L3 == HIGH ? "Disponible" : "Ocupado"));
  Serial.println("Sensor 4: " + String(L4 == HIGH ? "Disponible" : "Ocupado"));
}

// TODO: Implementar recepción de comandos desde la plataforma IoT para los servos
// Barrera entrada: servoEntrada.write(90) = abierta / servoEntrada.write(0) = cerrada
// Barrera salida:  servoSalida.write(90)  = abierta / servoSalida.write(0)  = cerrada

void loop() {
  // TODO: Ejecutar el loop de la plataforma IoT aquí

  unsigned long now = millis();
  if (now - lastSensorCheck >= SENSOR_INTERVAL) {
    lastSensorCheck = now;
    leerSensores();
  }
}
