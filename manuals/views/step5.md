[{]: <region> (header)
# Step 5: Authentication
[}]: #
[{]: <region> (body)
## Meteor Accounts (Server Side)

In this step we will authenticate and identify users in our app.

Before we go ahead and start extending our app, we will add a few packages which will make our lives a bit less complex when it comes to authentication and users management.

First we will update our Meteor server and add few Meteor packages called `accounts-base` and `accounts-phone` which will give us the ability to verify a user using an SMS code, so run the following inside `api` directory:

    $ meteor add accounts-base
    $ meteor add npm-bcrypt
    $ meteor add mys:accounts-phone

For the sake of debugging we gonna write an authentication settings file (`api/private/settings.json`) which might make our life easier, but once your'e in production mode you *shouldn't* use this configuration:

[{]: <helper> (diff_step 5.2)
#### Step 5.2: Added settings file

##### Added api/private/settings.json
```diff
@@ -0,0 +1,8 @@
+┊ ┊1┊{
+┊ ┊2┊  "accounts-phone": {
+┊ ┊3┊    "verificationWaitTime": 0,
+┊ ┊4┊    "verificationRetriesWaitTime": 0,
+┊ ┊5┊    "adminPhoneNumbers": ["+9721234567", "+97212345678", "+97212345679"],
+┊ ┊6┊    "phoneVerificationMasterCode": "1234"
+┊ ┊7┊  }
+┊ ┊8┊}
```
[}]: #

Now anytime we run our app we should provide it with a `settings.json`:

    $ meteor run --settings private/settings.json

To make it simpler we can add `start` script to `package.json`:

[{]: <helper> (diff_step 5.3)
#### Step 5.3: Updated NPM script

##### Changed package.json
```diff
@@ -4,6 +4,7 @@
 ┊ 4┊ 4┊  "homepage": "http://ionicframework.com/",
 ┊ 5┊ 5┊  "private": true,
 ┊ 6┊ 6┊  "scripts": {
+┊  ┊ 7┊    "api": "cd api && meteor run --settings private/settings.json",
 ┊ 7┊ 8┊    "build": "ionic-app-scripts build",
 ┊ 8┊ 9┊    "watch": "ionic-app-scripts watch",
 ┊ 9┊10┊    "serve:before": "watch",
```
[}]: #

> *NOTE*: If you would like to test the verification with a real phone number, `accounts-phone` provides an easy access for [twilio's API](https://www.twilio.com/), for more information see [accounts-phone's repo](https://github.com/okland/accounts-phone).

We will now apply the settings file we've just created so it can actually take effect:

[{]: <helper> (diff_step 5.4)
#### Step 5.4: Define SMS settings

##### Changed api/server/main.ts
```diff
@@ -2,10 +2,18 @@
 ┊ 2┊ 2┊import { Chats, Messages } from "../collections/whatsapp-collections";
 ┊ 3┊ 3┊import * as moment from "moment";
 ┊ 4┊ 4┊import { initMethods } from "./methods";
+┊  ┊ 5┊import { Accounts } from 'meteor/accounts-base';
+┊  ┊ 6┊
+┊  ┊ 7┊declare let SMS, Object;
 ┊ 5┊ 8┊
 ┊ 6┊ 9┊Meteor.startup(() => {
 ┊ 7┊10┊  initMethods();
 ┊ 8┊11┊
+┊  ┊12┊  if (Meteor.settings) {
+┊  ┊13┊    Object.assign(Accounts._options, Meteor.settings['accounts-phone']);
+┊  ┊14┊    SMS.twilio = Meteor.settings['twilio'];
+┊  ┊15┊  }
+┊  ┊16┊
 ┊ 9┊17┊  if (Chats.find({}).cursor.count() === 0) {
 ┊10┊18┊    let chatId;
```
[}]: #

## Meteor Accounts (Client Side)

And second, we will update the client, and add the corresponding authentication packages to it as well (run in the root directory):

    $ npm install accounts-base-client-side --save
    $ npm install accounts-phone --save

Let's import these packages in the app's main component so they can be a part of our bundle:

[{]: <helper> (diff_step 5.5)
#### Step 5.5: Added accounts packages to client side

##### Changed package.json
```diff
@@ -26,6 +26,8 @@
 ┊26┊26┊    "@ionic/storage": "1.1.6",
 ┊27┊27┊    "@types/meteor": "^1.3.31",
 ┊28┊28┊    "@types/underscore": "^1.7.36",
+┊  ┊29┊    "accounts-base-client-side": "^0.1.1",
+┊  ┊30┊    "accounts-phone": "0.0.1",
 ┊29┊31┊    "angular2-moment": "^1.0.0-beta.6",
 ┊30┊32┊    "babel-runtime": "^6.18.0",
 ┊31┊33┊    "ionic-angular": "2.0.0-rc.3",
```
[}]: #

Install the necessary typings:

    $ npm install @types/meteor-accounts-phone

And import them:

[{]: <helper> (diff_step 5.6 api/typings.d.ts)
#### Step 5.6: Add meteor-accounts-phone type declarations

##### Changed api/typings.d.ts
```diff
@@ -1,3 +1,4 @@
 ┊1┊1┊/// <reference types="@types/meteor" />
+┊ ┊2┊/// <reference types="@types/meteor-accounts-phone" />
 ┊2┊3┊/// <reference types="@types/underscore" />
 ┊3┊4┊/// <reference types="moment" />
```
[}]: #

## UI

For authentication we gonna create the following flow in our app:

- login - The initial page. Ask for the user's phone number.
- verification - Verify a user's phone number by an SMS authentication.
- profile - Ask a user to pickup its name. Afterwards he will be promoted to the tabs page.

Before we implement these page, we need to identify if a user is currently logged in. If so, he will be automatically promoted to the chats view, if not, he is gonna be promoted to the login view and enter a phone number.

Let's apply this feature to our app's NgModule bootstrap:

[{]: <helper> (diff_step 5.8)
#### Step 5.8: Wait for user if logging in

##### Changed src/app/main.dev.ts
```diff
@@ -4,7 +4,19 @@
 ┊ 4┊ 4┊import 'accounts-phone';
 ┊ 5┊ 5┊
 ┊ 6┊ 6┊import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
-┊ 7┊  ┊
 ┊ 8┊ 7┊import { AppModule } from './app.module';
+┊  ┊ 8┊import { MeteorObservable } from 'meteor-rxjs';
+┊  ┊ 9┊
+┊  ┊10┊declare let Meteor;
+┊  ┊11┊
+┊  ┊12┊Meteor.startup(() => {
+┊  ┊13┊  const sub = MeteorObservable.autorun().subscribe(() => {
+┊  ┊14┊    if (Meteor.loggingIn()) return;
+┊  ┊15┊
+┊  ┊16┊    setTimeout(() => {
+┊  ┊17┊      sub.unsubscribe();
+┊  ┊18┊    });
 ┊ 9┊19┊
-┊10┊  ┊platformBrowserDynamic().bootstrapModule(AppModule);
+┊  ┊20┊    platformBrowserDynamic().bootstrapModule(AppModule);
+┊  ┊21┊  });
+┊  ┊22┊});
```
[}]: #

And to production mode's entry point as well:

[{]: <helper> (diff_step 5.9)
#### Step 5.9: Wait for user if logging in, production

##### Changed src/app/main.prod.ts
```diff
@@ -5,8 +5,21 @@
 ┊ 5┊ 5┊
 ┊ 6┊ 6┊import { platformBrowser } from '@angular/platform-browser';
 ┊ 7┊ 7┊import { enableProdMode } from '@angular/core';
-┊ 8┊  ┊
 ┊ 9┊ 8┊import { AppModuleNgFactory } from './app.module.ngfactory';
+┊  ┊ 9┊import { MeteorObservable } from 'meteor-rxjs';
+┊  ┊10┊
+┊  ┊11┊declare let Meteor;
+┊  ┊12┊
+┊  ┊13┊Meteor.startup(() => {
+┊  ┊14┊  const sub = MeteorObservable.autorun().subscribe(() => {
+┊  ┊15┊    if (Meteor.loggingIn()) return;
+┊  ┊16┊
+┊  ┊17┊    setTimeout(() => {
+┊  ┊18┊      sub.unsubscribe();
+┊  ┊19┊    });
+┊  ┊20┊
+┊  ┊21┊    enableProdMode();
+┊  ┊22┊    platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
+┊  ┊23┊  });
+┊  ┊24┊});
 ┊10┊25┊
-┊11┊  ┊enableProdMode();
-┊12┊  ┊platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
```
[}]: #

Great, now that we're set, let's start implementing the views we mentioned earlier.

Let's start by creating the `LoginComponent`:

In this component we will request an SMS verification right after a phone number has been entered:

[{]: <helper> (diff_step 5.10)
#### Step 5.10: Create login component

##### Added src/pages/auth/login.ts
```diff
@@ -0,0 +1,69 @@
+┊  ┊ 1┊import { Component } from '@angular/core';
+┊  ┊ 2┊import { NavController, AlertController } from 'ionic-angular';
+┊  ┊ 3┊
+┊  ┊ 4┊declare let Accounts;
+┊  ┊ 5┊
+┊  ┊ 6┊@Component({
+┊  ┊ 7┊  selector: 'login',
+┊  ┊ 8┊  templateUrl: "login.html"
+┊  ┊ 9┊})
+┊  ┊10┊export class LoginComponent {
+┊  ┊11┊  phone = '';
+┊  ┊12┊
+┊  ┊13┊  constructor(
+┊  ┊14┊    public navCtrl: NavController,
+┊  ┊15┊    public alertCtrl: AlertController
+┊  ┊16┊  ) {}
+┊  ┊17┊
+┊  ┊18┊  onInputKeypress({keyCode}: KeyboardEvent): void {
+┊  ┊19┊    if (keyCode == 13) {
+┊  ┊20┊      this.login();
+┊  ┊21┊    }
+┊  ┊22┊  }
+┊  ┊23┊
+┊  ┊24┊  login(): void {
+┊  ┊25┊    const alert = this.alertCtrl.create({
+┊  ┊26┊      title: 'Confirm',
+┊  ┊27┊      message: `Would you like to proceed with the phone number ${this.phone}?`,
+┊  ┊28┊      buttons: [
+┊  ┊29┊        {
+┊  ┊30┊          text: 'Cancel',
+┊  ┊31┊          role: 'cancel'
+┊  ┊32┊        },
+┊  ┊33┊        {
+┊  ┊34┊          text: 'Yes',
+┊  ┊35┊          handler: () => {
+┊  ┊36┊            this.handleLogin(alert);
+┊  ┊37┊            return false;
+┊  ┊38┊          }
+┊  ┊39┊        }
+┊  ┊40┊      ]
+┊  ┊41┊    });
+┊  ┊42┊
+┊  ┊43┊    alert.present();
+┊  ┊44┊  }
+┊  ┊45┊
+┊  ┊46┊  private handleLogin(alert): void {
+┊  ┊47┊    Accounts.requestPhoneVerification(this.phone, (e: Error) => {
+┊  ┊48┊      alert.dismiss().then(() => {
+┊  ┊49┊        if (e) return this.handleError(e);
+┊  ┊50┊
+┊  ┊51┊        // this.navCtrl.push(VerificationComponent, {
+┊  ┊52┊        //   phone: this.phone
+┊  ┊53┊        // });
+┊  ┊54┊      });
+┊  ┊55┊    });
+┊  ┊56┊  }
+┊  ┊57┊
+┊  ┊58┊  private handleError(e: Error): void {
+┊  ┊59┊    console.error(e);
+┊  ┊60┊
+┊  ┊61┊    const alert = this.alertCtrl.create({
+┊  ┊62┊      title: 'Oops!',
+┊  ┊63┊      message: e.message,
+┊  ┊64┊      buttons: ['OK']
+┊  ┊65┊    });
+┊  ┊66┊
+┊  ┊67┊    alert.present();
+┊  ┊68┊  }
+┊  ┊69┊}
```
[}]: #

Few things to be explained:

- `onInputKeypress` is to catch Enter key press
- `login` method creates an alert (see [documentation](http://ionicframework.com/docs/v2/components/#alert)) to confirm the action
- `handleError` creates an alert with an error message
- `handleLogin` calls `Accounts.requestPhoneVerification` request an SMS verification and moves to verification view.

Okay, the logic is clear. Let's move to the template:

[{]: <helper> (diff_step 5.11)
#### Step 5.11: Create login component view

##### Added src/pages/auth/login.html
```diff
@@ -0,0 +1,25 @@
+┊  ┊ 1┊<ion-header>
+┊  ┊ 2┊  <ion-navbar color="whatsapp">
+┊  ┊ 3┊    <ion-title>Login</ion-title>
+┊  ┊ 4┊
+┊  ┊ 5┊    <ion-buttons end>
+┊  ┊ 6┊      <button ion-button class="done-button" (click)="login()">Done</button>
+┊  ┊ 7┊    </ion-buttons>
+┊  ┊ 8┊  </ion-navbar>
+┊  ┊ 9┊</ion-header>
+┊  ┊10┊
+┊  ┊11┊<ion-content padding class="login-page-content">
+┊  ┊12┊  <div class="instructions">
+┊  ┊13┊    <div>
+┊  ┊14┊      Please enter your phone number including its country code.
+┊  ┊15┊    </div>
+┊  ┊16┊    <br>
+┊  ┊17┊    <div>
+┊  ┊18┊      The messenger will send a one time SMS message to verify your phone number. Carrier SMS charges may apply.
+┊  ┊19┊    </div>
+┊  ┊20┊  </div>
+┊  ┊21┊
+┊  ┊22┊  <ion-item>
+┊  ┊23┊    <ion-input [(ngModel)]="phone" (keypress)="onInputKeypress($event)" type="tel" placeholder="Your phone number"></ion-input>
+┊  ┊24┊  </ion-item>
+┊  ┊25┊</ion-content>
```
[}]: #

And let's add some styles:

[{]: <helper> (diff_step 5.12)
#### Step 5.12: Add login component view style

##### Added src/pages/auth/login.scss
```diff
@@ -0,0 +1,11 @@
+┊  ┊ 1┊.login-page-content {
+┊  ┊ 2┊  .instructions {
+┊  ┊ 3┊    text-align: center;
+┊  ┊ 4┊    font-size: medium;
+┊  ┊ 5┊    margin: 50px;
+┊  ┊ 6┊  }
+┊  ┊ 7┊
+┊  ┊ 8┊  .text-input {
+┊  ┊ 9┊    text-align: center;
+┊  ┊10┊  }
+┊  ┊11┊}
```
[}]: #

And add the Login Component to the NgModule definition:

[{]: <helper> (diff_step 5.13)
#### Step 5.13: Add login component to NgModule

##### Changed src/app/app.module.ts
```diff
@@ -5,13 +5,15 @@
 ┊ 5┊ 5┊import { ChatsPage } from "../pages/chats/chats";
 ┊ 6┊ 6┊import { MomentModule } from "angular2-moment";
 ┊ 7┊ 7┊import { MessagesPage } from "../pages/messages/messages";
+┊  ┊ 8┊import { LoginComponent } from "../pages/auth/login";
 ┊ 8┊ 9┊
 ┊ 9┊10┊@NgModule({
 ┊10┊11┊  declarations: [
 ┊11┊12┊    MyApp,
 ┊12┊13┊    ChatsPage,
 ┊13┊14┊    TabsPage,
-┊14┊  ┊    MessagesPage
+┊  ┊15┊    MessagesPage,
+┊  ┊16┊    LoginComponent
 ┊15┊17┊  ],
 ┊16┊18┊  imports: [
 ┊17┊19┊    IonicModule.forRoot(MyApp),
```
```diff
@@ -22,7 +24,8 @@
 ┊22┊24┊    MyApp,
 ┊23┊25┊    ChatsPage,
 ┊24┊26┊    TabsPage,
-┊25┊  ┊    MessagesPage
+┊  ┊27┊    MessagesPage,
+┊  ┊28┊    LoginComponent
 ┊26┊29┊  ],
 ┊27┊30┊  providers: []
 ┊28┊31┊})
```
[}]: #

Now let's add the ability to identify whih page should be loaded - the main or login:

[{]: <helper> (diff_step 5.14)
#### Step 5.14: Add user identifiation in app's main component

##### Changed src/app/app.component.ts
```diff
@@ -1,17 +1,20 @@
 ┊ 1┊ 1┊import { Component } from '@angular/core';
 ┊ 2┊ 2┊import { Platform } from 'ionic-angular';
 ┊ 3┊ 3┊import { StatusBar, Splashscreen } from 'ionic-native';
-┊ 4┊  ┊
 ┊ 5┊ 4┊import { TabsPage } from '../pages/tabs/tabs';
+┊  ┊ 5┊import { LoginComponent } from '../pages/auth/login';
 ┊ 6┊ 6┊
+┊  ┊ 7┊declare let Meteor;
 ┊ 7┊ 8┊
 ┊ 8┊ 9┊@Component({
 ┊ 9┊10┊  template: `<ion-nav [root]="rootPage"></ion-nav>`
 ┊10┊11┊})
 ┊11┊12┊export class MyApp {
-┊12┊  ┊  rootPage = TabsPage;
+┊  ┊13┊  rootPage: any;
 ┊13┊14┊
 ┊14┊15┊  constructor(platform: Platform) {
+┊  ┊16┊    this.rootPage = Meteor.user() ? TabsPage : LoginComponent;
+┊  ┊17┊
 ┊15┊18┊    platform.ready().then(() => {
 ┊16┊19┊      // Okay, so the platform is ready and our plugins are available.
 ┊17┊20┊      // Here you can do any higher level native things you might need.
```
[}]: #

That's great, everything is set up. We can now move to verification page.

Let's create a component called `VerificationComponent`:

[{]: <helper> (diff_step 5.15)
#### Step 5.15: Add verification component

##### Added src/pages/verification/verification.ts
```diff
@@ -0,0 +1,54 @@
+┊  ┊ 1┊import { Component, OnInit, NgZone } from '@angular/core';
+┊  ┊ 2┊import { NavController, NavParams, AlertController } from 'ionic-angular';
+┊  ┊ 3┊
+┊  ┊ 4┊declare let Accounts;
+┊  ┊ 5┊
+┊  ┊ 6┊@Component({
+┊  ┊ 7┊  selector: 'verification',
+┊  ┊ 8┊  templateUrl: 'verification.html'
+┊  ┊ 9┊})
+┊  ┊10┊export class VerificationComponent implements OnInit {
+┊  ┊11┊  code: string = '';
+┊  ┊12┊  phone: string;
+┊  ┊13┊
+┊  ┊14┊  constructor(
+┊  ┊15┊    public navCtrl: NavController,
+┊  ┊16┊    public alertCtrl: AlertController,
+┊  ┊17┊    public zone: NgZone,
+┊  ┊18┊    public navParams: NavParams
+┊  ┊19┊  ) {}
+┊  ┊20┊
+┊  ┊21┊  ngOnInit() {
+┊  ┊22┊    this.phone = this.navParams.get('phone');
+┊  ┊23┊  }
+┊  ┊24┊
+┊  ┊25┊  onInputKeypress({keyCode}: KeyboardEvent): void {
+┊  ┊26┊    if (keyCode == 13) {
+┊  ┊27┊      this.verify();
+┊  ┊28┊    }
+┊  ┊29┊  }
+┊  ┊30┊
+┊  ┊31┊  verify(): void {
+┊  ┊32┊    Accounts.verifyPhone(this.phone, this.code, (e: Error) => {
+┊  ┊33┊      this.zone.run(() => {
+┊  ┊34┊        if (e) return this.handleError(e);
+┊  ┊35┊
+┊  ┊36┊        // this.navCtrl.setRoot(ProfileComponent, {}, {
+┊  ┊37┊        //   animate: true
+┊  ┊38┊        // });
+┊  ┊39┊      });
+┊  ┊40┊    });
+┊  ┊41┊  }
+┊  ┊42┊
+┊  ┊43┊  private handleError(e: Error): void {
+┊  ┊44┊    console.error(e);
+┊  ┊45┊
+┊  ┊46┊    const alert = this.alertCtrl.create({
+┊  ┊47┊      title: 'Oops!',
+┊  ┊48┊      message: e.message,
+┊  ┊49┊      buttons: ['OK']
+┊  ┊50┊    });
+┊  ┊51┊
+┊  ┊52┊    alert.present();
+┊  ┊53┊  }
+┊  ┊54┊}
```
[}]: #

Logic is pretty much the same as in LoginComponent. When verification succeed we redirect user to the `ProfileComponent` (this code is in comment, we will later remove the comment, after we add the actual component):

So let's add the view and the styles:

[{]: <helper> (diff_step 5.16)
#### Step 5.16: Add verification component view

##### Added src/pages/verification/verification.html
```diff
@@ -0,0 +1,25 @@
+┊  ┊ 1┊<ion-header>
+┊  ┊ 2┊  <ion-navbar color="whatsapp">
+┊  ┊ 3┊    <ion-title>Verification</ion-title>
+┊  ┊ 4┊
+┊  ┊ 5┊    <ion-buttons end>
+┊  ┊ 6┊      <button ion-button class="verify-button" (click)="verify()">Verify</button>
+┊  ┊ 7┊    </ion-buttons>
+┊  ┊ 8┊  </ion-navbar>
+┊  ┊ 9┊</ion-header>
+┊  ┊10┊
+┊  ┊11┊<ion-content padding class="verification-page-content">
+┊  ┊12┊  <div class="instructions">
+┊  ┊13┊    <div>
+┊  ┊14┊      An SMS message with the verification code has been sent to {{phone}}.
+┊  ┊15┊    </div>
+┊  ┊16┊    <br>
+┊  ┊17┊    <div>
+┊  ┊18┊      To proceed, please enter the 4-digit verification code below.
+┊  ┊19┊    </div>
+┊  ┊20┊  </div>
+┊  ┊21┊
+┊  ┊22┊  <ion-item>
+┊  ┊23┊    <ion-input [(ngModel)]="code" (keypress)="onInputKeypress($event)" type="tel" placeholder="Your verification code"></ion-input>
+┊  ┊24┊  </ion-item>
+┊  ┊25┊</ion-content>
```
[}]: #

[{]: <helper> (diff_step 5.17)
#### Step 5.17: Add verification component styles

##### Added src/pages/verification/verification.scss
```diff
@@ -0,0 +1,11 @@
+┊  ┊ 1┊.verification-page-content {
+┊  ┊ 2┊  .instructions {
+┊  ┊ 3┊    text-align: center;
+┊  ┊ 4┊    font-size: medium;
+┊  ┊ 5┊    margin: 50px;
+┊  ┊ 6┊  }
+┊  ┊ 7┊
+┊  ┊ 8┊  .text-input {
+┊  ┊ 9┊    text-align: center;
+┊  ┊10┊  }
+┊  ┊11┊}
```
[}]: #

And add it to the NgModule:

[{]: <helper> (diff_step 5.18)
#### Step 5.18: Add VerificationComponent to NgModule

##### Changed src/app/app.module.ts
```diff
@@ -6,6 +6,7 @@
 ┊ 6┊ 6┊import { MomentModule } from "angular2-moment";
 ┊ 7┊ 7┊import { MessagesPage } from "../pages/messages/messages";
 ┊ 8┊ 8┊import { LoginComponent } from "../pages/auth/login";
+┊  ┊ 9┊import { VerificationComponent } from "../pages/verification/verification";
 ┊ 9┊10┊
 ┊10┊11┊@NgModule({
 ┊11┊12┊  declarations: [
```
```diff
@@ -13,7 +14,8 @@
 ┊13┊14┊    ChatsPage,
 ┊14┊15┊    TabsPage,
 ┊15┊16┊    MessagesPage,
-┊16┊  ┊    LoginComponent
+┊  ┊17┊    LoginComponent,
+┊  ┊18┊    VerificationComponent
 ┊17┊19┊  ],
 ┊18┊20┊  imports: [
 ┊19┊21┊    IonicModule.forRoot(MyApp),
```
```diff
@@ -25,7 +27,8 @@
 ┊25┊27┊    ChatsPage,
 ┊26┊28┊    TabsPage,
 ┊27┊29┊    MessagesPage,
-┊28┊  ┊    LoginComponent
+┊  ┊30┊    LoginComponent,
+┊  ┊31┊    VerificationComponent
 ┊29┊32┊  ],
 ┊30┊33┊  providers: []
 ┊31┊34┊})
```
[}]: #

And now that we have the `VerificationComponent` we can use it inside the `LoginComponent`:

[{]: <helper> (diff_step 5.19)
#### Step 5.19: Add navigation to verification page from the login component

##### Changed src/pages/auth/login.ts
```diff
@@ -1,5 +1,6 @@
 ┊1┊1┊import { Component } from '@angular/core';
 ┊2┊2┊import { NavController, AlertController } from 'ionic-angular';
+┊ ┊3┊import { VerificationComponent } from "../verification/verification";
 ┊3┊4┊
 ┊4┊5┊declare let Accounts;
 ┊5┊6┊
```
```diff
@@ -48,9 +49,9 @@
 ┊48┊49┊      alert.dismiss().then(() => {
 ┊49┊50┊        if (e) return this.handleError(e);
 ┊50┊51┊
-┊51┊  ┊        // this.navCtrl.push(VerificationComponent, {
-┊52┊  ┊        //   phone: this.phone
-┊53┊  ┊        // });
+┊  ┊52┊        this.navCtrl.push(VerificationComponent, {
+┊  ┊53┊          phone: this.phone
+┊  ┊54┊        });
 ┊54┊55┊      });
 ┊55┊56┊    });
 ┊56┊57┊  }
```
[}]: #

Last step of our authentication pattern is to pickup a name.

Let's add a `Profile` interface, we will use it soon:

[{]: <helper> (diff_step 5.20)
#### Step 5.20: Add profile model decleration

##### Changed api/models/whatsapp-models.d.ts
```diff
@@ -1,4 +1,9 @@
 ┊1┊1┊declare module 'api/models/whatsapp-models' {
+┊ ┊2┊  interface Profile {
+┊ ┊3┊    name?: string;
+┊ ┊4┊    picture?: string;
+┊ ┊5┊  }
+┊ ┊6┊
 ┊2┊7┊  interface Chat {
 ┊3┊8┊    _id?: string;
 ┊4┊9┊    title?: string;
```
[}]: #

And let's create the `ProfileComponent`:

[{]: <helper> (diff_step 5.21)
#### Step 5.21: Add profile component

##### Added src/pages/profile/profile.ts
```diff
@@ -0,0 +1,50 @@
+┊  ┊ 1┊import { Component, OnInit } from '@angular/core';
+┊  ┊ 2┊import { NavController, AlertController } from 'ionic-angular';
+┊  ┊ 3┊import { MeteorObservable } from 'meteor-rxjs';
+┊  ┊ 4┊import { Profile } from 'api/models/whatsapp-models';
+┊  ┊ 5┊import { TabsPage } from "../tabs/tabs";
+┊  ┊ 6┊
+┊  ┊ 7┊declare let Meteor;
+┊  ┊ 8┊
+┊  ┊ 9┊@Component({
+┊  ┊10┊  selector: 'profile',
+┊  ┊11┊  templateUrl: 'profile.html'
+┊  ┊12┊})
+┊  ┊13┊export class ProfileComponent implements OnInit {
+┊  ┊14┊  profile: Profile;
+┊  ┊15┊
+┊  ┊16┊  constructor(
+┊  ┊17┊    public navCtrl: NavController,
+┊  ┊18┊    public alertCtrl: AlertController
+┊  ┊19┊  ) {}
+┊  ┊20┊
+┊  ┊21┊  ngOnInit(): void {
+┊  ┊22┊    this.profile = Meteor.user().profile || {
+┊  ┊23┊      name: '',
+┊  ┊24┊      picture: '/ionicons/dist/svg/ios-contact.svg'
+┊  ┊25┊    };
+┊  ┊26┊  }
+┊  ┊27┊
+┊  ┊28┊  done(): void {
+┊  ┊29┊    MeteorObservable.call('updateProfile', this.profile).subscribe({
+┊  ┊30┊      next: () => {
+┊  ┊31┊        this.navCtrl.push(TabsPage);
+┊  ┊32┊      },
+┊  ┊33┊      error: (e: Error) => {
+┊  ┊34┊        this.handleError(e);
+┊  ┊35┊      }
+┊  ┊36┊    });
+┊  ┊37┊  }
+┊  ┊38┊
+┊  ┊39┊  private handleError(e: Error): void {
+┊  ┊40┊    console.error(e);
+┊  ┊41┊
+┊  ┊42┊    const alert = this.alertCtrl.create({
+┊  ┊43┊      title: 'Oops!',
+┊  ┊44┊      message: e.message,
+┊  ┊45┊      buttons: ['OK']
+┊  ┊46┊    });
+┊  ┊47┊
+┊  ┊48┊    alert.present();
+┊  ┊49┊  }
+┊  ┊50┊}
```
[}]: #

The logic is simple, call `updateProfile` (we will implement it soon!) and redirect to `TabsPage` which is our main view if the action succeed.

If you'll take a look at the constructor's logic we set the default profile picture to be one of ionicon's svgs. We need to make sure there is an access point available through the network to that asset. If we'd like to serve files as-is we simply gonna add them to the `www` dir. But first we'll need to update our `.gitignore` file to contain the upcoming changes:

[{]: <helper> (diff_step 5.22)
#### Step 5.22: Add ionicons to .gitignore

##### Changed .gitignore
```diff
@@ -26,7 +26,8 @@
 ┊26┊26┊plugins/
 ┊27┊27┊plugins/android.json
 ┊28┊28┊plugins/ios.json
-┊29┊  ┊www/
+┊  ┊29┊www/*
+┊  ┊30┊!www/ionicons
 ┊30┊31┊$RECYCLE.BIN/
 ┊31┊32┊
 ┊32┊33┊.DS_Store
```
[}]: #

And now that git can recognize our changes, let's add a symlink to `ionicons` in the `www` dir:

    www$ ln -s ../node_modules/ionicons

There's no component without a view:

[{]: <helper> (diff_step 5.24)
#### Step 5.24: Add profile component view

##### Added src/pages/profile/profile.html
```diff
@@ -0,0 +1,21 @@
+┊  ┊ 1┊<ion-header>
+┊  ┊ 2┊  <ion-navbar color="whatsapp">
+┊  ┊ 3┊    <ion-title>Profile</ion-title>
+┊  ┊ 4┊
+┊  ┊ 5┊    <ion-buttons end>
+┊  ┊ 6┊      <button ion-button class="done-button" (click)="done()">Done</button>
+┊  ┊ 7┊    </ion-buttons>
+┊  ┊ 8┊  </ion-navbar>
+┊  ┊ 9┊</ion-header>
+┊  ┊10┊
+┊  ┊11┊<ion-content class="profile-page-content">
+┊  ┊12┊  <div class="profile-picture">
+┊  ┊13┊    <img [src]="profile.picture">
+┊  ┊14┊    <ion-icon name="create"></ion-icon>
+┊  ┊15┊  </div>
+┊  ┊16┊
+┊  ┊17┊  <ion-item class="profile-name">
+┊  ┊18┊    <ion-label stacked>Name</ion-label>
+┊  ┊19┊    <ion-input [(ngModel)]="profile.name" placeholder="Your name"></ion-input>
+┊  ┊20┊  </ion-item>
+┊  ┊21┊</ion-content>
```
[}]: #

And styles:

[{]: <helper> (diff_step 5.25)
#### Step 5.25: Add profile component view style

##### Added src/pages/profile/profile.scss
```diff
@@ -0,0 +1,20 @@
+┊  ┊ 1┊.profile-page-content {
+┊  ┊ 2┊  .profile-picture {
+┊  ┊ 3┊    max-width: 300px;
+┊  ┊ 4┊    display: block;
+┊  ┊ 5┊    margin: auto;
+┊  ┊ 6┊
+┊  ┊ 7┊    img {
+┊  ┊ 8┊      margin-bottom: -33px;
+┊  ┊ 9┊      width: 100%;
+┊  ┊10┊    }
+┊  ┊11┊
+┊  ┊12┊    ion-icon {
+┊  ┊13┊      float: right;
+┊  ┊14┊      font-size: 30px;
+┊  ┊15┊      opacity: 0.5;
+┊  ┊16┊      border-left: black solid 1px;
+┊  ┊17┊      padding-left: 5px;
+┊  ┊18┊    }
+┊  ┊19┊  }
+┊  ┊20┊}
```
[}]: #

And add it to the NgModule:

[{]: <helper> (diff_step 5.26)
#### Step 5.26: Add profile component to NgModule

##### Changed src/app/app.module.ts
```diff
@@ -7,6 +7,7 @@
 ┊ 7┊ 7┊import { MessagesPage } from "../pages/messages/messages";
 ┊ 8┊ 8┊import { LoginComponent } from "../pages/auth/login";
 ┊ 9┊ 9┊import { VerificationComponent } from "../pages/verification/verification";
+┊  ┊10┊import { ProfileComponent } from "../pages/profile/profile";
 ┊10┊11┊
 ┊11┊12┊@NgModule({
 ┊12┊13┊  declarations: [
```
```diff
@@ -15,7 +16,8 @@
 ┊15┊16┊    TabsPage,
 ┊16┊17┊    MessagesPage,
 ┊17┊18┊    LoginComponent,
-┊18┊  ┊    VerificationComponent
+┊  ┊19┊    VerificationComponent,
+┊  ┊20┊    ProfileComponent
 ┊19┊21┊  ],
 ┊20┊22┊  imports: [
 ┊21┊23┊    IonicModule.forRoot(MyApp),
```
```diff
@@ -28,7 +30,8 @@
 ┊28┊30┊    TabsPage,
 ┊29┊31┊    MessagesPage,
 ┊30┊32┊    LoginComponent,
-┊31┊  ┊    VerificationComponent
+┊  ┊33┊    VerificationComponent,
+┊  ┊34┊    ProfileComponent
 ┊32┊35┊  ],
 ┊33┊36┊  providers: []
 ┊34┊37┊})
```
[}]: #

And let's use it in the `VerificationComponent`:

[{]: <helper> (diff_step 5.27)
#### Step 5.27: Add profile component to verification navigation

##### Changed src/pages/verification/verification.ts
```diff
@@ -1,5 +1,6 @@
 ┊1┊1┊import { Component, OnInit, NgZone } from '@angular/core';
 ┊2┊2┊import { NavController, NavParams, AlertController } from 'ionic-angular';
+┊ ┊3┊import { ProfileComponent } from "../profile/profile";
 ┊3┊4┊
 ┊4┊5┊declare let Accounts;
 ┊5┊6┊
```
```diff
@@ -33,9 +34,9 @@
 ┊33┊34┊      this.zone.run(() => {
 ┊34┊35┊        if (e) return this.handleError(e);
 ┊35┊36┊
-┊36┊  ┊        // this.navCtrl.setRoot(ProfileComponent, {}, {
-┊37┊  ┊        //   animate: true
-┊38┊  ┊        // });
+┊  ┊37┊        this.navCtrl.setRoot(ProfileComponent, {}, {
+┊  ┊38┊          animate: true
+┊  ┊39┊        });
 ┊39┊40┊      });
 ┊40┊41┊    });
 ┊41┊42┊  }
```
[}]: #


Our authentication flow is complete! However there are some few adjustments we need to make before we proceed to the next step.

For the messaging system, each message should have an owner. If a user is logged-in a message document should be inserted with an additional `senderId` field:

[{]: <helper> (diff_step 5.28)
#### Step 5.28: Add senderId property to addMessage method

##### Changed api/server/methods.ts
```diff
@@ -10,6 +10,9 @@
 ┊10┊10┊export function initMethods() {
 ┊11┊11┊  Meteor.methods({
 ┊12┊12┊    addMessage(chatId: string, content: string) {
+┊  ┊13┊      if (!this.userId) throw new Meteor.Error('unauthorized',
+┊  ┊14┊        'User must be logged-in to create a new chat');
+┊  ┊15┊
 ┊13┊16┊      check(chatId, nonEmptyString);
 ┊14┊17┊      check(content, nonEmptyString);
 ┊15┊18┊
```
```diff
@@ -20,6 +23,7 @@
 ┊20┊23┊
 ┊21┊24┊      return {
 ┊22┊25┊        messageId: Messages.collection.insert({
+┊  ┊26┊          senderId: this.userId,
 ┊23┊27┊          chatId: chatId,
 ┊24┊28┊          content: content,
 ┊25┊29┊          createdAt: new Date()
```
[}]: #

[{]: <helper> (diff_step 5.29)
#### Step 5.29: Add it also to the model

##### Changed api/models/whatsapp-models.d.ts
```diff
@@ -17,5 +17,6 @@
 ┊17┊17┊    content?: string;
 ┊18┊18┊    createdAt?: Date;
 ┊19┊19┊    ownership?: string;
+┊  ┊20┊    senderId?: string;
 ┊20┊21┊  }
 ┊21┊22┊}
```
[}]: #

We can determine message ownership inside the component:

[{]: <helper> (diff_step 5.30)
#### Step 5.30: Determine message ownership based on sender id

##### Changed src/pages/messages/messages.ts
```diff
@@ -16,11 +16,14 @@
 ┊16┊16┊  messages: Observable<Message[]>;
 ┊17┊17┊  message: string = "";
 ┊18┊18┊  autoScroller: MutationObserver;
+┊  ┊19┊  senderId: string;
 ┊19┊20┊
 ┊20┊21┊  constructor(navParams: NavParams, element: ElementRef) {
 ┊21┊22┊    this.selectedChat = <Chat>navParams.get('chat');
 ┊22┊23┊    this.title = this.selectedChat.title;
 ┊23┊24┊    this.picture = this.selectedChat.picture;
+┊  ┊25┊    this.senderId = Meteor.userId();
+┊  ┊26┊
 ┊24┊27┊  }
 ┊25┊28┊
 ┊26┊29┊  private get messagesPageContent(): Element {
```
```diff
@@ -44,15 +47,12 @@
 ┊44┊47┊  }
 ┊45┊48┊
 ┊46┊49┊  ngOnInit() {
-┊47┊  ┊    let isEven = false;
-┊48┊  ┊
 ┊49┊50┊    this.messages = Messages.find(
 ┊50┊51┊      {chatId: this.selectedChat._id},
 ┊51┊52┊      {sort: {createdAt: 1}}
 ┊52┊53┊    ).map((messages: Message[]) => {
 ┊53┊54┊      messages.forEach((message: Message) => {
-┊54┊  ┊        message.ownership = isEven ? 'mine' : 'other';
-┊55┊  ┊        isEven = !isEven;
+┊  ┊55┊        message.ownership = this.senderId == message.senderId ? 'mine' : 'other';
 ┊56┊56┊      });
 ┊57┊57┊
 ┊58┊58┊      return messages;
```
[}]: #

Now we're going to add the abilities to log-out and edit our profile as well, which are going to be presented to us using a popover. 

Let's show a popover any time we press on the options icon in the top right corner of the chats view!

Let's start by adding the actual Component that will open on the popover:

[{]: <helper> (diff_step 5.31)
#### Step 5.31: Add chats-options component

##### Added src/pages/chat-options/chat-options.ts
```diff
@@ -0,0 +1,72 @@
+┊  ┊ 1┊import { Component } from '@angular/core';
+┊  ┊ 2┊import { NavController, ViewController, AlertController } from 'ionic-angular';
+┊  ┊ 3┊import { ProfileComponent } from '../profile/profile';
+┊  ┊ 4┊import { LoginComponent } from '../auth/login';
+┊  ┊ 5┊
+┊  ┊ 6┊declare let Meteor;
+┊  ┊ 7┊
+┊  ┊ 8┊@Component({
+┊  ┊ 9┊  selector: 'chats-options',
+┊  ┊10┊  templateUrl: 'chat-options.html'
+┊  ┊11┊})
+┊  ┊12┊export class ChatsOptionsComponent {
+┊  ┊13┊  constructor(
+┊  ┊14┊    public navCtrl: NavController,
+┊  ┊15┊    public viewCtrl: ViewController,
+┊  ┊16┊    public alertCtrl: AlertController
+┊  ┊17┊  ) {}
+┊  ┊18┊
+┊  ┊19┊  editProfile(): void {
+┊  ┊20┊    this.viewCtrl.dismiss().then(() => {
+┊  ┊21┊      this.navCtrl.push(ProfileComponent);
+┊  ┊22┊    });
+┊  ┊23┊  }
+┊  ┊24┊
+┊  ┊25┊  logout(): void {
+┊  ┊26┊    const alert = this.alertCtrl.create({
+┊  ┊27┊      title: 'Logout',
+┊  ┊28┊      message: 'Are you sure you would like to proceed?',
+┊  ┊29┊      buttons: [
+┊  ┊30┊        {
+┊  ┊31┊          text: 'Cancel',
+┊  ┊32┊          role: 'cancel'
+┊  ┊33┊        },
+┊  ┊34┊        {
+┊  ┊35┊          text: 'Yes',
+┊  ┊36┊          handler: () => {
+┊  ┊37┊            this.handleLogout(alert);
+┊  ┊38┊            return false;
+┊  ┊39┊          }
+┊  ┊40┊        }
+┊  ┊41┊      ]
+┊  ┊42┊    });
+┊  ┊43┊
+┊  ┊44┊    this.viewCtrl.dismiss().then(() => {
+┊  ┊45┊      alert.present();
+┊  ┊46┊    });
+┊  ┊47┊  }
+┊  ┊48┊
+┊  ┊49┊  private handleLogout(alert): void {
+┊  ┊50┊    Meteor.logout((e: Error) => {
+┊  ┊51┊      alert.dismiss().then(() => {
+┊  ┊52┊        if (e) return this.handleError(e);
+┊  ┊53┊
+┊  ┊54┊        this.navCtrl.setRoot(LoginComponent, {}, {
+┊  ┊55┊          animate: true
+┊  ┊56┊        });
+┊  ┊57┊      });
+┊  ┊58┊    });
+┊  ┊59┊  }
+┊  ┊60┊
+┊  ┊61┊  private handleError(e: Error): void {
+┊  ┊62┊    console.error(e);
+┊  ┊63┊
+┊  ┊64┊    const alert = this.alertCtrl.create({
+┊  ┊65┊      title: 'Oops!',
+┊  ┊66┊      message: e.message,
+┊  ┊67┊      buttons: ['OK']
+┊  ┊68┊    });
+┊  ┊69┊
+┊  ┊70┊    alert.present();
+┊  ┊71┊  }
+┊  ┊72┊}
```
[}]: #

> It uses popover functionality from Ionic ([see documentation](http://ionicframework.com/docs/v2/components/#popovers)).

[{]: <helper> (diff_step 5.32)
#### Step 5.32: Add chats-options component view

##### Added src/pages/chat-options/chat-options.html
```diff
@@ -0,0 +1,18 @@
+┊  ┊ 1┊<ion-content class="chats-options-page-content">
+┊  ┊ 2┊  <ion-list class="options">
+┊  ┊ 3┊    <button ion-item class="option option-profile" (click)="editProfile()">
+┊  ┊ 4┊      <ion-icon name="contact" class="option-icon"></ion-icon>
+┊  ┊ 5┊      <div class="option-name">Profile</div>
+┊  ┊ 6┊    </button>
+┊  ┊ 7┊
+┊  ┊ 8┊    <button ion-item class="option option-about">
+┊  ┊ 9┊      <ion-icon name="information-circle" class="option-icon"></ion-icon>
+┊  ┊10┊      <div class="option-name">About</div>
+┊  ┊11┊    </button>
+┊  ┊12┊
+┊  ┊13┊    <button ion-item class="option option-logout" (click)="logout()">
+┊  ┊14┊      <ion-icon name="log-out" class="option-icon"></ion-icon>
+┊  ┊15┊      <div class="option-name">Logout</div>
+┊  ┊16┊    </button>
+┊  ┊17┊  </ion-list>
+┊  ┊18┊</ion-content>
```
[}]: #

[{]: <helper> (diff_step 5.33)
#### Step 5.33: Add chats-options component view style

##### Added src/pages/chat-options/chat-options.scss
```diff
@@ -0,0 +1,13 @@
+┊  ┊ 1┊.chats-options-page-content {
+┊  ┊ 2┊  .options {
+┊  ┊ 3┊    margin: 0;
+┊  ┊ 4┊  }
+┊  ┊ 5┊
+┊  ┊ 6┊  .option-name {
+┊  ┊ 7┊    float: left;
+┊  ┊ 8┊  }
+┊  ┊ 9┊
+┊  ┊10┊  .option-icon {
+┊  ┊11┊    float: right;
+┊  ┊12┊  }
+┊  ┊13┊}
```
[}]: #

And add it to the NgModule:

[{]: <helper> (diff_step 5.34)
#### Step 5.34: Add chats-options component to the module definition

##### Changed src/app/app.module.ts
```diff
@@ -8,6 +8,7 @@
 ┊ 8┊ 8┊import { LoginComponent } from "../pages/auth/login";
 ┊ 9┊ 9┊import { VerificationComponent } from "../pages/verification/verification";
 ┊10┊10┊import { ProfileComponent } from "../pages/profile/profile";
+┊  ┊11┊import { ChatsOptionsComponent } from "../pages/chat-options/chat-options";
 ┊11┊12┊
 ┊12┊13┊@NgModule({
 ┊13┊14┊  declarations: [
```
```diff
@@ -17,7 +18,8 @@
 ┊17┊18┊    MessagesPage,
 ┊18┊19┊    LoginComponent,
 ┊19┊20┊    VerificationComponent,
-┊20┊  ┊    ProfileComponent
+┊  ┊21┊    ProfileComponent,
+┊  ┊22┊    ChatsOptionsComponent
 ┊21┊23┊  ],
 ┊22┊24┊  imports: [
 ┊23┊25┊    IonicModule.forRoot(MyApp),
```
```diff
@@ -31,7 +33,8 @@
 ┊31┊33┊    MessagesPage,
 ┊32┊34┊    LoginComponent,
 ┊33┊35┊    VerificationComponent,
-┊34┊  ┊    ProfileComponent
+┊  ┊36┊    ProfileComponent,
+┊  ┊37┊    ChatsOptionsComponent
 ┊35┊38┊  ],
 ┊36┊39┊  providers: []
 ┊37┊40┊})
```
[}]: #

Now let's use it inside the `ChatsPage`:

[{]: <helper> (diff_step 5.35)
#### Step 5.35: Use the popover component

##### Changed src/pages/chats/chats.ts
```diff
@@ -2,8 +2,9 @@
 ┊ 2┊ 2┊import { Observable } from "rxjs";
 ┊ 3┊ 3┊import { Chat } from "api/models/whatsapp-models";
 ┊ 4┊ 4┊import { Chats, Messages } from "api/collections/whatsapp-collections";
-┊ 5┊  ┊import { NavController } from "ionic-angular";
+┊  ┊ 5┊import { NavController, PopoverController } from "ionic-angular";
 ┊ 6┊ 6┊import { MessagesPage } from "../messages/messages";
+┊  ┊ 7┊import { ChatsOptionsComponent } from "../chat-options/chat-options";
 ┊ 7┊ 8┊
 ┊ 8┊ 9┊@Component({
 ┊ 9┊10┊  templateUrl: 'chats.html'
```
```diff
@@ -11,7 +12,7 @@
 ┊11┊12┊export class ChatsPage implements OnInit {
 ┊12┊13┊  chats;
 ┊13┊14┊
-┊14┊  ┊  constructor(private navCtrl: NavController) {
+┊  ┊15┊  constructor(public navCtrl: NavController, public popoverCtrl: PopoverController) {
 ┊15┊16┊
 ┊16┊17┊  }
 ┊17┊18┊
```
```diff
@@ -33,6 +34,14 @@
 ┊33┊34┊      ).zone();
 ┊34┊35┊  }
 ┊35┊36┊
+┊  ┊37┊  showOptions(): void {
+┊  ┊38┊    const popover = this.popoverCtrl.create(ChatsOptionsComponent, {}, {
+┊  ┊39┊      cssClass: 'options-popover'
+┊  ┊40┊    });
+┊  ┊41┊
+┊  ┊42┊    popover.present();
+┊  ┊43┊  }
+┊  ┊44┊
 ┊36┊45┊  showMessages(chat): void {
 ┊37┊46┊    this.navCtrl.push(MessagesPage, {chat});
 ┊38┊47┊  }
```
[}]: #

And let's add an event handler in the view:

[{]: <helper> (diff_step 5.36)
#### Step 5.36: Added event handler

##### Changed src/pages/chats/chats.html
```diff
@@ -7,7 +7,7 @@
 ┊ 7┊ 7┊      <button ion-button icon-only class="add-chat-button">
 ┊ 8┊ 8┊        <ion-icon name="person-add"></ion-icon>
 ┊ 9┊ 9┊      </button>
-┊10┊  ┊      <button ion-button icon-only class="options-button">
+┊  ┊10┊      <button ion-button icon-only class="options-button" (click)="showOptions()">
 ┊11┊11┊        <ion-icon name="more"></ion-icon>
 ┊12┊12┊      </button>
 ┊13┊13┊    </ion-buttons>
```
[}]: #

As for now, once you click on the options icon in the chats view, the popover should appear in the middle of the screen. To fix it, we simply gonna edit the `scss` file of the chats page:

[{]: <helper> (diff_step 5.37)
#### Step 5.37: Add options-popover style to chats stylesheet

##### Changed src/pages/chats/chats.scss
```diff
@@ -18,3 +18,15 @@
 ┊18┊18┊    }
 ┊19┊19┊  }
 ┊20┊20┊}
+┊  ┊21┊
+┊  ┊22┊.options-popover {
+┊  ┊23┊  $popover-width: 200px;
+┊  ┊24┊  $popover-margin: 5px;
+┊  ┊25┊
+┊  ┊26┊  .popover-content {
+┊  ┊27┊    width: $popover-width;
+┊  ┊28┊    transform-origin: right top 0px !important;
+┊  ┊29┊    left: calc(100% - #{$popover-width} - #{$popover-margin}) !important;
+┊  ┊30┊    top: $popover-margin !important;
+┊  ┊31┊  }
+┊  ┊32┊}
```
[}]: #

And last, let's implement the server side method (`updateProfile`):

[{]: <helper> (diff_step 5.38)
#### Step 5.38: Added updateProfile method

##### Changed api/server/methods.ts
```diff
@@ -1,6 +1,7 @@
 ┊1┊1┊import { Meteor } from 'meteor/meteor';
 ┊2┊2┊import { Chats, Messages } from "../collections/whatsapp-collections";
 ┊3┊3┊import { check, Match } from "meteor/check";
+┊ ┊4┊import { Profile } from "api/models/whatsapp-models";
 ┊4┊5┊
 ┊5┊6┊const nonEmptyString = Match.Where((str) => {
 ┊6┊7┊  check(str, String);
```
```diff
@@ -9,6 +10,19 @@
 ┊ 9┊10┊
 ┊10┊11┊export function initMethods() {
 ┊11┊12┊  Meteor.methods({
+┊  ┊13┊    updateProfile(profile: Profile): void {
+┊  ┊14┊      if (!this.userId) throw new Meteor.Error('unauthorized',
+┊  ┊15┊        'User must be logged-in to create a new chat');
+┊  ┊16┊
+┊  ┊17┊      check(profile, {
+┊  ┊18┊        name: nonEmptyString,
+┊  ┊19┊        picture: nonEmptyString
+┊  ┊20┊      });
+┊  ┊21┊
+┊  ┊22┊      Meteor.users.update(this.userId, {
+┊  ┊23┊        $set: {profile}
+┊  ┊24┊      });
+┊  ┊25┊    },
 ┊12┊26┊    addMessage(chatId: string, content: string) {
 ┊13┊27┊      if (!this.userId) throw new Meteor.Error('unauthorized',
 ┊14┊28┊        'User must be logged-in to create a new chat');
```
[}]: #

[}]: #
[{]: <region> (footer)
[{]: <helper> (nav_step)
| [< Previous Step](step4.md) | [Next Step >](step6.md) |
|:--------------------------------|--------------------------------:|
[}]: #
[}]: #