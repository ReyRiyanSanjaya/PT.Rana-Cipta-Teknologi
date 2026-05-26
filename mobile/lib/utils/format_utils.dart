import 'package:rana_merchant/config/merchant_config.dart';
import 'package:intl/intl.dart';

class FormatUtils {
  static String formatCurrency(double value) {
    return NumberFormat.currency(locale: 'id_ID', symbol: '${MerchantConfig.defaultCurrencySymbol} ', decimalDigits: 0).format(value);
  }
}
