#include <WiFi.h>
#include <ESP32Servo.h>
#include <Firebase_ESP_Client.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// WiFi
#define WIFI_SSID "AMARANTO"
#define WIFI_PASSWORD "Victordag0000"

// Firebase
#define API_KEY "AIzaSyD5oOWKwiuvlnhGSPm4pXmcHPZKNqQfVEU"
#define FIREBASE_PROJECT_ID "evc-parking"
#define USER_EMAIL "penelope@puroiub.com"
#define USER_PASSWORD "penelope"

// Sensores
#define SENSOR1 4
#define SENSOR2 15
#define SENSOR3 5
#define SENSOR4 19

// Servos
#define SERVO_ENTRADA_PIN 14
#define SERVO_SALIDA_PIN 27

Servo servoEntrada;
Servo servoSalida;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastUpdate = 0;

String sensorEstado(int pin) {
  return digitalRead(pin) == HIGH ? "disponible" : "ocupado";
}

void writeParkingState(String docPath, String field, String value) {
  FirebaseJson content;
  content.set("fields/" + field + "/stringValue", value);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", docPath.c_str(), content.raw(), field.c_str())) {
    Serial.println("OK -> " + field + ": " + value);
  } else {
    Serial.println("ERROR Firestore: " + fbdo.errorReason());
  }
}

String readServoCommand(const String& fieldName) {
  String documentPath = "control/servos";

  if (Firebase.Firestore.getDocument(&fbdo, FIREBASE_PROJECT_ID, "", documentPath.c_str(), "")) {
    FirebaseJson payload;
    payload.setJsonData(fbdo.payload());

    FirebaseJsonData result;
    payload.get(result, "fields/" + fieldName + "/stringValue");

    if (result.success) return result.to<String>();
  } else {
    Serial.println("ERROR leyendo servos: " + fbdo.errorReason());
  }

  return "";
}

void setup() {
  Serial.begin(115200);

  pinMode(SENSOR1, INPUT_PULLUP);
  pinMode(SENSOR2, INPUT_PULLUP);
  pinMode(SENSOR3, INPUT_PULLUP);
  pinMode(SENSOR4, INPUT_PULLUP);

  servoEntrada.attach(SERVO_ENTRADA_PIN);
  servoSalida.attach(SERVO_SALIDA_PIN);
  servoEntrada.write(0);
  servoSalida.write(0);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nWiFi conectado");

  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (millis() - lastUpdate > 2000) {
    lastUpdate = millis();

    String e1 = sensorEstado(SENSOR1);
    String e2 = sensorEstado(SENSOR2);
    String e3 = sensorEstado(SENSOR3);
    String e4 = sensorEstado(SENSOR4);

    writeParkingState("parking/estado", "espacio1", e1);
    writeParkingState("parking/estado", "espacio2", e2);
    writeParkingState("parking/estado", "espacio3", e3);
    writeParkingState("parking/estado", "espacio4", e4);

    String entradaCmd = readServoCommand("entrada");
    String salidaCmd = readServoCommand("salida");

    if (entradaCmd == "abrir") servoEntrada.write(90);
    else if (entradaCmd == "cerrar") servoEntrada.write(0);

    if (salidaCmd == "abrir") servoSalida.write(90);
    else if (salidaCmd == "cerrar") servoSalida.write(0);

    Serial.println("E1: " + e1);
    Serial.println("E2: " + e2);
    Serial.println("E3: " + e3);
    Serial.println("E4: " + e4);
    Serial.println("Entrada: " + entradaCmd);
    Serial.println("Salida: " + salidaCmd);
  }
}
