import schema from '@/instant.schema';
import { InstaQLEntity } from '@instantdb/react';

// Production Types
export type ProductionJob = InstaQLEntity<typeof schema, 'productionJobs'>;
export type PrintHistory = InstaQLEntity<typeof schema, 'printHistory'>;
export type Printer = InstaQLEntity<typeof schema, 'printers'>;
export type ScheduledJob = InstaQLEntity<typeof schema, 'scheduledJobs'>;

// Product Types
export type CatalogProduct = InstaQLEntity<typeof schema, 'catalogProducts'>;
export type MarketingPost = InstaQLEntity<typeof schema, 'marketingPosts'>;

// Global Catalog Types
export type Product = InstaQLEntity<typeof schema, 'catalogProducts'>;
export type ProductInventory = InstaQLEntity<typeof schema, 'productInventory'>;
export type GlobalColor = InstaQLEntity<typeof schema, 'globalColors'>;
export type Spool = InstaQLEntity<typeof schema, 'spools'>;
export type PrintFarm = InstaQLEntity<typeof schema, 'printFarms'>;
export type Order = InstaQLEntity<typeof schema, 'orders'>;
// export type ProductPrintableVariant = InstaQLEntity<typeof schema, 'productPrintableVariants'>;
// export type PrintFarmJob = InstaQLEntity<typeof schema, 'printFarmJobs'>;

export type FullSpool = Spool & {
    globalColor?: GlobalColor;
    printHistory?: PrintHistory[];
};