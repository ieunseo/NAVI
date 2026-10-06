package com.project.navi.domain.auth.service;

import com.project.navi.domain.auth.service.EmailVerificationService.EmailVerificationRequestedEvent;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.UriComponentsBuilder;

/*
 * 인증 메일 발송
 *
 * 가입 트랜잭션이 커밋된 뒤에 보낸다.
 * (롤백된 가입에 메일이 나가지 않도록)
 * 발송에 실패해도 가입은 유지되고, 사용자는 앱에서 재발송할 수 있다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailVerificationMailSender {

    private final JavaMailSender mailSender;
    private final EmailVerificationProperties properties;

    @TransactionalEventListener
    public void send(EmailVerificationRequestedEvent event) {
        String link = UriComponentsBuilder.fromUriString(properties.baseUrl())
                .path("/api/auth/verify-email")
                .queryParam("token", event.token())
                .toUriString();

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(properties.from());
            helper.setTo(event.email());
            helper.setSubject("[NAVI] 이메일 인증을 완료해 주세요");
            helper.setText(html(link), true);

            mailSender.send(message);
        } catch (Exception e) {
            log.error("인증 메일 발송 실패: {}", event.email(), e);
        }
    }

    private String html(String link) {
        return """
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#222">
                  <h2 style="margin:0 0 16px">NAVI 가입을 환영해요</h2>
                  <p style="line-height:1.6;margin:0 0 24px">
                    아래 버튼을 눌러 이메일 인증을 완료해 주세요.<br>
                    링크는 %d시간 동안 유효해요.
                  </p>
                  <a href="%s"
                     style="display:inline-block;padding:14px 24px;background:#222;color:#fff;
                            text-decoration:none;border-radius:10px;font-weight:600">
                    이메일 인증하기
                  </a>
                  <p style="margin:32px 0 0;font-size:12px;color:#888">
                    본인이 가입하지 않았다면 이 메일을 무시해 주세요.
                  </p>
                </div>
                """.formatted(properties.tokenTtl().toHours(), link);
    }
}
