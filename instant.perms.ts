// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const adminEmails = [
  // Replace this before pushing perms:
  "goncalo.ribeiro.pereira@gmail.com",
];

const rules = {
  attrs: {
    allow: {
      create: "false",
    },
  },
  $files: {
    allow: {
      view: "true",
      create: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  globalColors: {
    allow: {
      view: "true",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  productCategories: {
    allow: {
      view: "true",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  catalogProducts: {
    allow: {
      view: "true",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  marketingPosts: {
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  storyCategories: {
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  productInventory: {
    allow: {
      view: "true",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  orders: {
    allow: {
      view: "isAdmin",
      create: "isPublicPreOrder",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
      validInitialStatus:
        "data.paymentStatus == 'pending' && data.fulfillmentStatus == 'new'",
      validShipping:
        "data.shippingMethod in ['pickup_carcavelos', 'mainland_portugal']",
      validPayment:
        "data.paymentPreference in ['mbway', 'bank_transfer', 'cash_pickup', 'other']",
      totalsReasonable:
        "data.subtotal >= 0 && data.shippingCost >= 0 && data.total >= data.subtotal && data.total <= 1000",
      hasContact:
        "size(data.customerName) >= 2 && (data.customerEmail != null && size(data.customerEmail) >= 6)",
      isPublicPreOrder: 
        "validInitialStatus && validShipping && validPayment && totalsReasonable", // && hasContact",
    },
  },
  aiUsageLogs: {
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  productionJobs: {
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  spools: {
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  printers: {
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  printerSlots: {
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  printHistory: {
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
  scheduledJobs: {
    allow: {
      view: "isAdmin",
      create: "isAdmin",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
    },
  },
} as InstantRules;

export default rules;
