import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../constants/colors";
import type { Term } from "../../lib/terms";

type Props = {
    terms: Term[];
    agreedIds: Set<string>;
    onChange: (agreedIds: Set<string>) => void;
    error?: string;
};

/*
 * 회원가입 약관 동의
 *
 * "모두 동의" + 약관별 체크
 * documentUrl 이 있는 약관은 "보기" 로 본문을 열 수 있습니다.
 */
export function TermsAgreement({
                                   terms,
                                   agreedIds,
                                   onChange,
                                   error,
                               }: Props) {
    const allAgreed =
        terms.length > 0 &&
        terms.every((term) => agreedIds.has(term.id));

    const toggleAll = () => {
        onChange(
            allAgreed
                ? new Set()
                : new Set(terms.map((term) => term.id))
        );
    };

    const toggle = (termId: string) => {
        const next = new Set(agreedIds);

        if (next.has(termId)) {
            next.delete(termId);
        } else {
            next.add(termId);
        }

        onChange(next);
    };

    return (
        <View>
            <Pressable
                style={styles.allRow}
                onPress={toggleAll}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allAgreed }}
            >
                <CheckIcon checked={allAgreed} />
                <Text style={styles.allText}>
                    약관에 모두 동의합니다
                </Text>
            </Pressable>

            <View style={styles.divider} />

            {terms.map((term) => {
                const checked = agreedIds.has(term.id);

                return (
                    <View key={term.id} style={styles.row}>
                        <Pressable
                            style={styles.rowLeft}
                            onPress={() => toggle(term.id)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked }}
                        >
                            <CheckIcon checked={checked} />
                            <Text style={styles.termText}>
                                {term.required ? "[필수] " : "[선택] "}
                                {term.title}
                            </Text>
                        </Pressable>

                        {term.documentUrl ? (
                            <Pressable
                                hitSlop={8}
                                onPress={() =>
                                    WebBrowser.openBrowserAsync(
                                        term.documentUrl as string
                                    )
                                }
                            >
                                <Text style={styles.viewText}>보기</Text>
                            </Pressable>
                        ) : null}
                    </View>
                );
            })}

            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}
        </View>
    );
}

function CheckIcon({ checked }: { checked: boolean }) {
    return (
        <Ionicons
            name={checked ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={checked ? Colors.primary : Colors.border}
        />
    );
}

const styles = StyleSheet.create({
    allRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
    },

    allText: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.textPrimary,
    },

    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 8,
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 6,
    },

    rowLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    termText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },

    viewText: {
        fontSize: 13,
        color: Colors.textTertiary,
        textDecorationLine: "underline",
    },

    errorText: {
        marginTop: 8,
        fontSize: 13,
        color: Colors.error,
    },
});
