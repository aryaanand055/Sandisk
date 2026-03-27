`timescale 1ns / 1ps
module led_blinker_tb_meas;
    reg clk;
    reg reset;
    wire led;
    real time1, time2;

    led_blinker #( .BLINK_PERIOD(4) ) uut ( .clk(clk), .reset(reset), .led(led) );

    initial begin
        clk = 0; forever #5 clk = ~clk;
    end

    initial begin
        reset = 1; #10 reset = 0;
        wait(led == 1);
        time1 = $realtime;
        wait(led == 0);
        time2 = $realtime;
        $display("Period: %f", time2 - time1);
        #100 $finish;
    end
endmodule
