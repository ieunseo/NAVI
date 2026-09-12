import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { supabase } from "@/lib/supabase";

export default function HomeScreen() {
  const [status, setStatus] = useState("확인 중...");

  useEffect(() => {
    const checkSupabase = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error(error);
        setStatus("Supabase 연결 오류");
        return;
      }

      console.log("session:", data.session);
      setStatus("Supabase 연결 정상");
    };

    checkSupabase();
  }, []);

  return (
      <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
      >
        <Text>{status}</Text>
      </View>
  );
}