import 'dotenv/config';

export default {
  "expo": {
    "name": "Dishify",
    "slug": "food-delivery-driver",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "fooddeliverydriver",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "owner": "braiiny-food",
    "ios": {
      "supportsTablet": true,
      "config": {
        "googleMapsApiKey": process.env.GOOGLE_MAPS_API_KEY
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "googleServicesFile": "./google-services.json",
      "package": "com.braiinyfood.fooddeliverydriver",
      "config": {
        "googleMaps": {
          // Pulls the key from your local .env or EAS Secrets
          "apiKey": process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/app-logo.png",
          "imageWidth": 160,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      "expo-secure-store",
      "expo-task-manager",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow this app to use your location to track deliveries in the background.",
          "isAndroidBackgroundLocationEnabled": true
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "9cbd7a8c-4816-4b41-a4cc-c596db891481"
      },
      "googleMapsApiKey": process.env.GOOGLE_MAPS_API_KEY
    }
  }
};