enum CandyColor { red, blue, green, yellow, purple, orange }
enum SpecialType { none, stripedH, stripedV, wrapped, colorBomb }

class Candy {
  final CandyColor color;
  final SpecialType special;
  
  const Candy(this.color, {this.special = SpecialType.none});
  
  Candy copyWith({CandyColor? color, SpecialType? special}) {
    return Candy(color ?? this.color, special: special ?? this.special);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Candy &&
          runtimeType == other.runtimeType &&
          color == other.color &&
          special == other.special;

  @override
  int get hashCode => color.hashCode ^ special.hashCode;
}
