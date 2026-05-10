import * as React from "react";
import { ChevronRight, Star, Heart, Share2, ShoppingCart, Send, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface ProductTag {
  label: string;
  icon?: React.ElementType;
}

interface Seller {
  id?: string;
  name: string;
  avatarUrl: string;
  rating: number;
  href?: string;
}

interface Product {
  name: string;
  /** Numeric price in major units. Pass `null` to hide the numeric price (price-gating). */
  price: number | null;
  shippingCost: number;
  currency: string;
  images: string[];
  description: string;
  tags: ProductTag[];
  /** Optional override shown in place of the numeric price block when `price === null`. */
  priceFallback?: React.ReactNode;
}

export interface ProductDetailPageProps {
  product: Product;
  seller: Seller;
  breadcrumbs: BreadcrumbItem[];
  /** Replaces the default Buy Now / Contact Seller buttons. */
  actions?: React.ReactNode;
  /** Hides the heart/share/find-similar utility actions. */
  hideUtilityActions?: boolean;
}

const StarRating = ({ rating, className }: { rating: number; className?: string }) => (
  <div className={cn("flex items-center gap-0.5", className)}>
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={cn(
          "h-4 w-4",
          i < Math.floor(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/50"
        )}
      />
    ))}
    <span className="ml-2 text-sm font-medium text-muted-foreground">{rating.toFixed(1)}</span>
  </div>
);

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  seller,
  breadcrumbs,
  actions,
  hideUtilityActions,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const safeImages = product.images.length ? product.images : ["/placeholder.svg"];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 bg-background text-foreground">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center text-sm text-muted-foreground mb-4">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            <a href={item.href} className="hover:text-primary transition-colors">{item.label}</a>
            {index < breadcrumbs.length - 1 && <ChevronRight className="h-4 w-4 mx-1" />}
          </React.Fragment>
        ))}
      </nav>

      {!hideUtilityActions && (
        <div className="flex justify-between items-center mb-6">
          <div />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
              <span className="sr-only">Favorite</span>
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
              <span className="sr-only">Share</span>
            </Button>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border bg-muted"
            >
              <img
                src={safeImages[currentImageIndex]}
                alt={`${product.name} image ${currentImageIndex + 1}`}
                className="object-cover w-full h-full"
              />
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {safeImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    currentImageIndex === index ? "bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2" type="button">
              <Camera className="h-4 w-4" /> Find Similar
            </Button>
          </div>
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{product.name}</h1>
          <div className="mt-2">
            {product.price === null ? (
              product.priceFallback ?? (
                <span className="text-sm text-muted-foreground">Login para ver o preço</span>
              )
            ) : (
              <>
                <span className="text-4xl font-bold tabular-nums">
                  {product.currency}
                  {product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  + {product.currency}
                  {product.shippingCost.toFixed(2)} fee
                </span>
              </>
            )}
          </div>

          {actions ?? (
            <div className="flex gap-2 my-6">
              <Button size="lg" className="flex-1 gap-2"><ShoppingCart className="h-5 w-5" /> Buy Now</Button>
              <Button size="lg" variant="outline" className="flex-1 gap-2"><Send className="h-5 w-5" /> Contact Seller</Button>
            </div>
          )}

          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {product.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-sm font-normal py-1 px-3 gap-2">
                  {tag.icon && <tag.icon className="h-4 w-4" />}
                  {tag.label}
                </Badge>
              ))}
            </div>
          )}

          {product.description && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          <div className="mt-8 pt-6 border-t">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={seller.avatarUrl} alt={seller.name} />
                  <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{seller.name}</p>
                  <StarRating rating={seller.rating} />
                </div>
              </div>
              {seller.href && (
                <Button variant="link" className="text-primary" asChild>
                  <a href={seller.href}>All listings &rarr;</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
