# FocusRoom

## Run for All Platforms

```cmd
npm install
npm run token-server
```

## Run on PC

```cmd
npm run web
```

## Run on Android

```cmd
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --profile development --platform android --clear-cache
npx expo start --dev-client --lan --clear
```
