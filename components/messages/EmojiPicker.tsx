import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const CATEGORIES = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "sentiment-satisfied-alt",
    emojis:
      "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 🤥 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 🫤 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 🥹 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👻 👽 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾".split(
        " ",
      ),
  },
  {
    id: "people",
    label: "People",
    icon: "people",
    emojis:
      "👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 🤲 🙏 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 🙋 🙆 🙅 🤷 🤦 🙍 🙎 💁 🙇 💃 🕺 🧍 🧎 🏃 🚶".split(
        " ",
      ),
  },
  {
    id: "animals",
    label: "Animals",
    icon: "pets",
    emojis:
      "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🦮 🐩 🐈 🐓 🦃 🦚 🦜 🦢 🦩 🕊️ 🐇 🦝 🦨 🦡 🦦 🦥 🐁 🐀 🐿️ 🦔".split(
        " ",
      ),
  },
  {
    id: "food",
    label: "Food",
    icon: "restaurant",
    emojis:
      "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🫖 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🧊".split(
        " ",
      ),
  },
  {
    id: "travel",
    label: "Travel",
    icon: "flight",
    emojis:
      "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🚏 🛣️ 🛤️ 🚦 🚥 🚧 ⚓ 🛟 ⛵ 🚤 🛳️ ⛴️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🚀 🛸 🌍 🌎 🌏 🌐 🗺️ 🧭 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ 🏟️ 🏛️ 🏗️ 🏘️ 🏚️ 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ ⛺ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 🌌".split(
        " ",
      ),
  },
  {
    id: "activities",
    label: "Activities",
    icon: "sports-soccer",
    emojis:
      "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤼 🤸 ⛹️ 🤺 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🪈 🎲 ♟️ 🎯 🎳 🎮 🕹️ 🧩".split(
        " ",
      ),
  },
  {
    id: "objects",
    label: "Objects",
    icon: "lightbulb",
    emojis:
      "💌 💘 💝 💖 💗 💓 💞 💕 💟 ❣️ 💔 ❤️‍🔥 ❤️‍🩹 ❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💋 💯 💢 💥 💫 💦 💨 🕳️ 💣 💬 👁️‍🗨️ 🗨️ 🗯️ 💭 💤 👋 ✍️ 💅 🤳 💍 💎 🔇 🔈 🔉 🔊 📢 📣 📯 🔔 🔕 🎼 🎵 🎶 🎙️ 🎚️ 🎛️ 🎤 🎧 📻 🎷 🪗 🎸 🎹 🎺 🎻 🪕 🥁 📱 📲 ☎️ 📞 📟 📠 🔋 🪫 🔌 💻 🖥️ 🖨️ ⌨️ 🖱️ 🖲️ 💽 💾 💿 📀 🧮 🎥 🎞️ 📽️ 🎬 📺 📷 📸 📹 📼 🔍 🔎 💡 🔦 🕯️ 🪔 📔 📕 📖 📗 📘 📙 📚 📓 📒 📃 📜 📰 🗞️ 📑 🔖 🏷️ 💰 🪙 💴 💵 💶 💷 💸 💳 🧾 💹 ✉️ 📧 📨 📩 📤 📥 📦 📫 📪 📬 📭 📮 🗳️ ✏️ ✒️ 🖋️ 🖊️ 🖌️ 🖍️ 📝 📁 📂 🗂️ 📅 📆 🗒️ 🗓️ 📇 📈 📉 📊 📋 📌 📍 📎 🖇️ 📏 📐 ✂️ 🗃️ 🗄️ 🗑️ 🔒 🔓 🔏 🔐 🔑 🗝️ 🔨 🪓 ⛏️ ⚒️ 🛠️ 🗡️ ⚔️ 🔫 🪃 🛡️ 🔧 🪛 🔩 ⚙️ 🗜️ ⚖️ 🦯 🔗 ⛓️ 🪝 🧰 🧲 🪜 🧪 🧫 🧬 🔬 🔭 📡 💉 🩸 💊 🩹 🩺 🚪 🛗 🪞 🪟 🛏️ 🛋️ 🪑 🚽 🪠 🚿 🛁 🪤 🪒 🧴 🧷 🧹 🧺 🧻 🪣 🧼 🫧 🪥 🧽 🧯 🛒 🚬 ⚰️ 🪦 ⚱️ 🗿 🪧".split(
        " ",
      ),
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "tag-faces",
    emojis:
      "❤️ 🧡 💛 💚 💙 🩵 💜 🖤 🩶 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ✅ ❎ ➕ ➖ ➗ ✖️ ♾️ 💲 💱™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ⭐ 🌟 ✨ ⚡ 🔥 💧 🌈 🎵 🎶 ☀️ 🌙 ☁️".split(
        " ",
      ),
  },
];

type EmojiPickerProps = {
  visible: boolean;
  accentColor: string;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

const EmojiPicker = ({
  visible,
  accentColor,
  onSelect,
  onClose,
}: EmojiPickerProps) => {
  const [categoryId, setCategoryId] = useState("smileys");
  const [search, setSearch] = useState("");
  const category =
    CATEGORIES.find((item) => item.id === categoryId) || CATEGORIES[0];
  const emojis = useMemo(() => {
    const query = search.trim();
    if (!query) return category.emojis;
    return CATEGORIES.flatMap((item) => item.emojis).filter((emoji) =>
      emoji.includes(query),
    );
  }, [category.emojis, search]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.sheet}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Choose an emoji</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close emoji picker"
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={22} color="#53657A" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search emojis"
            placeholderTextColor="#8291A3"
            accessibilityLabel="Search emojis"
          />
          {!search ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
            >
              {CATEGORIES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.categoryButton,
                    categoryId === item.id && {
                      backgroundColor: `${accentColor}18`,
                    },
                  ]}
                  onPress={() => setCategoryId(item.id)}
                  accessibilityLabel={`${item.label} emoji`}
                  accessibilityState={{ selected: categoryId === item.id }}
                >
                  <MaterialIcons
                    name={item.icon as keyof typeof MaterialIcons.glyphMap}
                    size={20}
                    color={categoryId === item.id ? accentColor : "#6B7C90"}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      categoryId === item.id && { color: accentColor },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
          <Text style={styles.categoryTitle}>
            {search ? "Search results" : category.label}
          </Text>
          <ScrollView
            style={styles.emojiScroll}
            contentContainerStyle={styles.emojiGrid}
            keyboardShouldPersistTaps="handled"
          >
            {emojis.map((emoji, index) => (
              <TouchableOpacity
                key={`${emoji}-${index}`}
                style={styles.emojiButton}
                onPress={() => {
                  onSelect(emoji);
                }}
                accessibilityLabel={`Insert ${emoji}`}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            {!emojis.length ? (
              <Text style={styles.noResults}>No matching emojis</Text>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(9, 18, 31, 0.48)",
  },
  sheet: {
    maxHeight: "72%",
    paddingBottom: 26,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#F7F8FA",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    color: "#172B42",
    fontSize: 16,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#E9EDF2",
  },
  search: {
    marginHorizontal: 14,
    marginBottom: 9,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#E9EDF2",
    color: "#172B42",
    fontSize: 14,
  },
  categories: {
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  categoryButton: {
    minWidth: 68,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 11,
  },
  categoryText: {
    color: "#6B7C90",
    fontSize: 9,
    fontWeight: "600",
  },
  categoryTitle: {
    marginHorizontal: 17,
    marginTop: 9,
    marginBottom: 4,
    color: "#53657A",
    fontSize: 12,
    fontWeight: "700",
  },
  emojiScroll: {
    minHeight: 160,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  emojiButton: {
    width: "12.5%",
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  emoji: {
    fontSize: 25,
  },
  noResults: {
    padding: 18,
    color: "#6B7C90",
    fontSize: 13,
  },
});

export default EmojiPicker;
