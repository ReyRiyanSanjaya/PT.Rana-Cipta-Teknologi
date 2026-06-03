class PricingTier {
  final int minQty;
  final double price;

  PricingTier({required this.minQty, required this.price});

  factory PricingTier.fromJson(Map<String, dynamic> json) {
    return PricingTier(
      minQty: (json['minQty'] as num?)?.toInt() ?? 1,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class WholesaleDistributor {
  final String id;
  final String companyName;

  WholesaleDistributor({required this.id, required this.companyName});

  factory WholesaleDistributor.fromJson(Map<String, dynamic> json) {
    return WholesaleDistributor(
      id: json['id']?.toString() ?? '',
      companyName: json['companyName']?.toString() ?? 'Distributor',
    );
  }
}

class WholesaleProduct {
  final String id;
  final String name;
  final double wholesalePrice; // base price (lowest tier or first tier)
  final String image;
  final List<String> images;
  final String supplier;
  final String description;
  final List<PricingTier> pricingTiers;
  final int moq;
  final int stockQuantity;
  final String unit;
  final String? categoryId;
  final String? categoryName;
  final String? distributorId;
  final WholesaleDistributor? distributor;

  WholesaleProduct({
    required this.id,
    required this.name,
    required this.wholesalePrice,
    required this.image,
    this.images = const [],
    this.supplier = 'Rana Grosir',
    this.description = '',
    this.pricingTiers = const [],
    this.moq = 1,
    this.stockQuantity = 0,
    this.unit = 'pcs',
    this.categoryId,
    this.categoryName,
    this.distributorId,
    this.distributor,
  });

  factory WholesaleProduct.fromJson(Map<String, dynamic> json) {
    // Parse pricing tiers
    List<PricingTier> tiers = [];
    final rawTiers = json['pricingTiers'];
    if (rawTiers is List) {
      tiers = rawTiers
          .whereType<Map<String, dynamic>>()
          .map((t) => PricingTier.fromJson(t))
          .toList();
      tiers.sort((a, b) => a.minQty.compareTo(b.minQty));
    }

    // Base price: dari server sudah di-normalize sebagai 'price' (harga tier terbesar qty = termurah)
    // Untuk display card: tampilkan harga tier pertama (harga normal, bukan bulk)
    double basePrice = (json['price'] as num?)?.toDouble() ??
        (json['wholesalePrice'] as num?)?.toDouble() ?? 0.0;
    // Jika ada tiers, harga awal (tampil di card) = tier pertama (min qty paling rendah)
    if (tiers.isNotEmpty) {
      basePrice = tiers.first.price; // harga satuan normal
    }

    // Parse images
    List<String> imgs = [];
    final rawImgs = json['images'];
    if (rawImgs is List) {
      imgs = rawImgs.map((e) => e.toString()).where((e) => e.isNotEmpty).toList();
    }
    final singleImg = json['imageUrl']?.toString() ?? '';
    if (imgs.isEmpty && singleImg.isNotEmpty) imgs = [singleImg];

    // Distributor info
    WholesaleDistributor? dist;
    if (json['distributor'] is Map) {
      dist = WholesaleDistributor.fromJson(
          Map<String, dynamic>.from(json['distributor'] as Map));
    }

    return WholesaleProduct(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown',
      wholesalePrice: basePrice,
      image: imgs.isNotEmpty ? imgs[0] : singleImg,
      images: imgs,
      supplier: dist?.companyName ??
          json['supplierName']?.toString() ??
          'Rana Grosir',
      description: json['description']?.toString() ?? '',
      pricingTiers: tiers,
      moq: (json['moq'] as num?)?.toInt() ?? 1,
      stockQuantity: (json['stockQuantity'] as num?)?.toInt() ?? 0,
      unit: json['unit']?.toString() ?? 'pcs',
      categoryId: json['categoryId']?.toString(),
      categoryName: json['category']?.toString(),
      distributorId: json['distributorId']?.toString() ?? dist?.id,
      distributor: dist,
    );
  }

  /// Price for a given quantity (respects tiers)
  double priceForQty(int qty) {
    if (pricingTiers.isEmpty) return wholesalePrice;
    // sort ascending by minQty
    final sorted = [...pricingTiers]
      ..sort((a, b) => a.minQty.compareTo(b.minQty));
    double result = sorted.first.price;
    for (final tier in sorted) {
      if (qty >= tier.minQty) result = tier.price;
    }
    return result;
  }
}
