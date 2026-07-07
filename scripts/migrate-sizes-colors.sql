ALTER TABLE "Product" ADD COLUMN "sizes" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN "colors" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "Product" SET "sizes" = ARRAY["size"] WHERE "size" IS NOT NULL AND "size" != '';
UPDATE "Product" SET "colors" = ARRAY["color"] WHERE "color" IS NOT NULL AND "color" != '';

ALTER TABLE "Product" DROP COLUMN "size";
ALTER TABLE "Product" DROP COLUMN "color";
