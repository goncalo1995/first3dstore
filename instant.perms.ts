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
  orderRequests: {
    allow: {
      view: "isAdmin",
      create: "isPublicRequest",
      update: "isAdmin",
      delete: "isAdmin",
    },
    bind: {
      isAdmin: `auth.email in ${JSON.stringify(adminEmails)}`,
      validPhotoStatus: "data.status == 'PENDING_REVIEW'",
      validB2BStatus: "data.status == 'B2B_LEAD'",
      validBaseColor: "data.baseColor == null || data.baseColor in ['black', 'wood']",
      validPaidState: "data.isPaid == null || data.isPaid == false",
      hasCustomer:
        "size(data.customerName) >= 2 && size(data.customerEmail) >= 6 && data.customerPhone != null && size(data.customerPhone) >= 6",
      hasImage: "data.imageUrl != null && size(data.imageUrl) >= 12",
      hasB2BLead: "size(data.customerEmail) >= 6 && data.notes != null && size(data.notes) >= 10",
      noAdminFields: "!('leadType' in request.modifiedFields) && !('createdAt' in request.modifiedFields) && !('updatedAt' in request.modifiedFields)",
      isPublicPhotoRequest: "validPhotoStatus && validBaseColor && validPaidState && hasCustomer && hasImage && noAdminFields",
      isPublicB2BLead: "validB2BStatus && validPaidState && hasB2BLead && noAdminFields",
      isPublicRequest: "isPublicPhotoRequest || isPublicB2BLead",
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
  stripeWebhookEvents: {
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
