import { Meteor } from 'meteor/meteor';
import { Chats, Messages } from "../collections/whatsapp-collections";
import { check, Match } from "meteor/check";
import { Profile } from "api/models/whatsapp-models";

const nonEmptyString = Match.Where((str) => {
  check(str, String);
  return str.length > 0;
});

export function initMethods() {
  Meteor.methods({
    updateProfile(profile: Profile): void {
      if (!this.userId) throw new Meteor.Error('unauthorized',
        'User must be logged-in to create a new chat');

      check(profile, {
        name: nonEmptyString,
        picture: nonEmptyString
      });

      Meteor.users.update(this.userId, {
        $set: {profile}
      });
    },
    addMessage(chatId: string, content: string) {
      if (!this.userId) throw new Meteor.Error('unauthorized',
        'User must be logged-in to create a new chat');

      check(chatId, nonEmptyString);
      check(content, nonEmptyString);

      const chatExists = !!Chats.collection.find(chatId).count();

      if (!chatExists) throw new Meteor.Error('chat-not-exists',
        'Chat doesn\'t exist');

      return {
        messageId: Messages.collection.insert({
          senderId: this.userId,
          chatId: chatId,
          content: content,
          createdAt: new Date()
        })
      }
    }
  });
}
