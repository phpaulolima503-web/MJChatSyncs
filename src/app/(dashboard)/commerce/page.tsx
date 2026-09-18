"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShoppingCart, Plus, Search, Trash2, Package, Tag, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CommercePage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0.00");
  const [currency, setCurrency] = useState("USD");
  const [inStock, setInStock] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setProducts(data);
    setLoading(false);
  }

  function handleOpenDialog() {
    setName("");
    setDescription("");
    setPrice("0.00");
    setInStock(true);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      currency,
      in_stock: inStock,
      // Placeholder image for demo
      image_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=256`
    };

    const { error } = await supabase.from("products").insert(payload);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Product added to catalog");
    }

    setSaving(false);
    setDialogOpen(false);
    loadProducts();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error("Failed to delete product");
    else {
      toast.success("Product removed");
      loadProducts();
    }
  }

  const filteredProducts = products.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Catalog & Commerce</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your WhatsApp product catalog and share items directly in chats.
          </p>
        </div>
        <Button
          onClick={handleOpenDialog}
          className="bg-emerald-600 text-foreground hover:bg-emerald-700 shrink-0 shadow-lg shadow-emerald-900/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-card border-border text-foreground max-w-md"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-card border border-border" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-dashed border-border bg-card/30">
          <div className="p-4 bg-emerald-500/10 rounded-full mb-4">
            <ShoppingCart className="h-10 w-10 text-emerald-500" />
          </div>
          <p className="text-base font-semibold text-foreground">Your catalog is empty</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6 text-center max-w-sm">
            Add products to your catalog so agents can easily share them with customers via WhatsApp.
          </p>
          <Button onClick={handleOpenDialog} className="bg-emerald-600 hover:bg-emerald-700 text-foreground">
            Add your first product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-border hover:shadow-xl hover:shadow-emerald-900/10 transition-all">
              <div className="aspect-square bg-background relative overflow-hidden flex items-center justify-center group-hover:opacity-90 transition-opacity">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                )}
                {!product.in_stock && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                    <span className="px-3 py-1 bg-red-500/90 text-foreground text-xs font-bold uppercase tracking-wider rounded">Out of Stock</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full shadow-lg" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                </div>
                <p className="text-2xl font-bold text-emerald-400 mb-3">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price)}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                  {product.description || "No description."}
                </p>
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs font-medium text-foreground">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" /> WhatsApp ID: {product.id.split('-')[0]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">Product Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Premium Consultation"
                className="bg-muted border-border text-foreground"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Price</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-9 bg-muted border-border text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Currency</Label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product..."
                className="bg-muted border-border text-foreground resize-none"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-border">
              <input
                type="checkbox"
                id="inStock"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-muted text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="inStock" className="text-sm font-medium text-foreground cursor-pointer">
                Product is currently in stock
              </Label>
            </div>
          </div>
          <DialogFooter className="bg-card/70 border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border text-foreground hover:bg-muted hover:text-foreground">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-foreground">
              {saving ? "Saving..." : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
