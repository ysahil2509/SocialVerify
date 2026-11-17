import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };
import { DATABASE_URL } from '../lib/config';
import { localStore } from './localStore';

let pgClient: any = null;
let useLocalStore = false;

try {
  pgClient = postgres<Contract>({
    contractJson,
    url: DATABASE_URL,
  });
} catch (err) {
  console.warn('[SocialVerify DB] PostgreSQL init error; utilizing local store fallback:', err);
  useLocalStore = true;
}

function shouldFallback(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = (err.code || "").toLowerCase();
  return (
    msg.includes("econnrefused") ||
    msg.includes("connection") ||
    msg.includes("marker") ||
    msg.includes("failed to connect") ||
    msg.includes("does not exist") ||
    msg.includes("relation") ||
    msg.includes("table") ||
    code.includes("42p01") ||
    code.includes("econnrefused") ||
    code.includes("contract.marker_read_failed") ||
    code.includes("sql_connection")
  );
}

const userProxy = {
  where: (filter: { email?: string; id?: string }) => {
    if (useLocalStore || !pgClient) {
      return localStore.userWhere(filter);
    }
    let origBuilder: any;
    try {
      origBuilder = pgClient.orm.public.User.where(filter);
    } catch (err: any) {
      if (shouldFallback(err)) {
        useLocalStore = true;
        console.warn('[SocialVerify DB] Falling back to embedded local store for User.where()');
        return localStore.userWhere(filter);
      }
      throw err;
    }
    return {
      first: async () => {
        try {
          return await origBuilder.first();
        } catch (err: any) {
          if (shouldFallback(err)) {
            useLocalStore = true;
            console.warn('[SocialVerify DB] Falling back to embedded local store for User.where().first()');
            return localStore.userWhere(filter).first();
          }
          throw err;
        }
      },
      update: async (updates: any) => {
        try {
          return await origBuilder.update(updates);
        } catch (err: any) {
          if (shouldFallback(err)) {
            useLocalStore = true;
            console.warn('[SocialVerify DB] Falling back to embedded local store for User.where().update()');
            return localStore.userWhere(filter).update(updates);
          }
          throw err;
        }
      }
    };
  },
  create: async (data: any) => {
    if (useLocalStore || !pgClient) {
      return localStore.createUser(data);
    }
    try {
      return await pgClient.orm.public.User.create(data);
    } catch (err: any) {
      if (shouldFallback(err)) {
        useLocalStore = true;
        console.warn('[SocialVerify DB] Falling back to embedded local store for User.create()');
        return localStore.createUser(data);
      }
      throw err;
    }
  }
};

const conversationProxy = {
  where: (filter: { id?: string; userId?: string }) => {
    if (useLocalStore || !pgClient) {
      return localStore.conversationWhere(filter);
    }
    let origBuilder: any;
    try {
      origBuilder = pgClient.orm.public.Conversation.where(filter);
    } catch (err: any) {
      if (shouldFallback(err)) {
        useLocalStore = true;
        console.warn('[SocialVerify DB] Falling back to embedded local store for Conversation.where()');
        return localStore.conversationWhere(filter);
      }
      throw err;
    }
    return {
      include: (rel: string, fn: any) => {
        const withInc = origBuilder.include(rel, fn);
        return {
          orderBy: (sortFn: any) => {
            const withOrder = withInc.orderBy(sortFn);
            return {
              all: async () => {
                try {
                  return await withOrder.all();
                } catch (err: any) {
                  if (shouldFallback(err)) {
                    useLocalStore = true;
                    console.warn('[SocialVerify DB] Falling back to embedded local store for Conversation.where().include().orderBy().all()');
                    return localStore.conversationWhere(filter).include(rel, fn).orderBy(sortFn).all();
                  }
                  throw err;
                }
              }
            };
          }
        };
      },
      orderBy: (sortFn: any) => {
        const withOrder = origBuilder.orderBy(sortFn);
        return {
          all: async () => {
            try {
              return await withOrder.all();
            } catch (err: any) {
              if (shouldFallback(err)) {
                useLocalStore = true;
                return localStore.conversationWhere(filter).orderBy(sortFn).all();
              }
              throw err;
            }
          }
        };
      },
      first: async () => {
        try {
          return await origBuilder.first();
        } catch (err: any) {
          if (shouldFallback(err)) {
            useLocalStore = true;
            console.warn('[SocialVerify DB] Falling back to embedded local store for Conversation.where().first()');
            return localStore.conversationWhere(filter).first();
          }
          throw err;
        }
      },
      all: async () => {
        try {
          return await origBuilder.all();
        } catch (err: any) {
          if (shouldFallback(err)) {
            useLocalStore = true;
            return localStore.conversationWhere(filter).all();
          }
          throw err;
        }
      },
      delete: async () => {
        try {
          return await origBuilder.delete();
        } catch (err: any) {
          if (shouldFallback(err)) {
            useLocalStore = true;
            return localStore.conversationWhere(filter).delete();
          }
          throw err;
        }
      },
      update: async (updates: any) => {
        try {
          return await origBuilder.update(updates);
        } catch (err: any) {
          if (shouldFallback(err)) {
            useLocalStore = true;
            return localStore.conversationWhere(filter).update(updates);
          }
          throw err;
        }
      }
    };
  },
  create: async (data: any) => {
    if (useLocalStore || !pgClient) {
      return localStore.createConversation(data);
    }
    try {
      return await pgClient.orm.public.Conversation.create(data);
    } catch (err: any) {
      if (shouldFallback(err)) {
        useLocalStore = true;
        console.warn('[SocialVerify DB] Falling back to embedded local store for Conversation.create()');
        return localStore.createConversation(data);
      }
      throw err;
    }
  }
};

const chatProxy = {
  where: (filter: { conversationId?: string }) => {
    if (useLocalStore || !pgClient) {
      return localStore.chatWhere(filter);
    }
    let origBuilder: any;
    try {
      origBuilder = pgClient.orm.public.Chat.where(filter);
    } catch (err: any) {
      if (shouldFallback(err)) {
        useLocalStore = true;
        console.warn('[SocialVerify DB] Falling back to embedded local store for Chat.where()');
        return localStore.chatWhere(filter);
      }
      throw err;
    }
    return {
      orderBy: (sortFn: any) => {
        const withOrder = origBuilder.orderBy(sortFn);
        return {
          all: async () => {
            try {
              return await withOrder.all();
            } catch (err: any) {
              if (shouldFallback(err)) {
                useLocalStore = true;
                return localStore.chatWhere(filter).orderBy(sortFn).all();
              }
              throw err;
            }
          }
        };
      }
    };
  },
  create: async (data: any) => {
    if (useLocalStore || !pgClient) {
      return localStore.createChat(data);
    }
    try {
      return await pgClient.orm.public.Chat.create(data);
    } catch (err: any) {
      if (shouldFallback(err)) {
        useLocalStore = true;
        console.warn('[SocialVerify DB] Falling back to embedded local store for Chat.create()');
        return localStore.createChat(data);
      }
      throw err;
    }
  }
};

export const db: any = {
  orm: {
    public: {
      User: userProxy,
      Conversation: conversationProxy,
      Chat: chatProxy,
    }
  }
};
